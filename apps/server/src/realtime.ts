/**
 * @file   apps/server/src/realtime.ts
 * @brief  The socket side: watching a show, the pushed projections, the direction's actions.
 *
 * Responsibility: a socket watches one show (at most 10 watches in 10 s). Organisers and admins
 *                 receive the organiser view, everyone else the public view, players also their
 *                 personal view; a client never receives more than its projection (CONCEPT §8).
 *                 Every direction message is checked against the session as it stands now and,
 *                 in the domain, against the direction holder, and acknowledged at once. A change of a show is pushed to its watchers,
 *                 with the players' current names and badges. A socket whose session ends (sign-out,
 *                 a new sign-in, the website's account feed) is disconnected at once. Anyone
 *                 watching a live show may applaud (./applause.ts); the count goes to the
 *                 show's watchers.
 * Depends on:     socket.io, fastify, @seasonal/kit/server, @sc/application (types),
 *                 @sc/contracts, @sc/domain, ./applause.js, ./session.js
 */
import type { Outcome, ShowService } from '@sc/application';
import {
  canDirect,
  HandOverRequestSchema,
  SelectRequestSchema,
  ShowRequestSchema,
  StepRequestSchema,
  WatchRequestSchema,
  type Ack,
  type ClientToServerEvents,
  type Me,
  type OrganiserRef,
  type ServerToClientEvents,
} from '@sc/contracts';
import { organiserView, personalView, publicView, type People, type ShowModel } from '@sc/domain';
import { RateLimiter } from '@seasonal/kit/server';
import type { FastifyInstance } from 'fastify';
import type { Server, Socket } from 'socket.io';

import { applauseCounter } from './applause.js';
import { sessionFromHeader, type Auth } from './session.js';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface Watcher {
  readonly socket: IoSocket;
  readonly me: Me | null;
}

export interface Realtime {
  /** Sends the show's new state to everyone watching it, each their projection. */
  push(model: ShowModel): void;
  /** Stops pending applause sends (the server closes). */
  stop(): void;
}

const refused = (error: string): Ack => ({ ok: false, error });
const ackOf = (outcome: Outcome): Ack => (outcome.ok ? { ok: true } : refused(outcome.error));

interface Watching {
  readonly organisersOf: (showId: string) => OrganiserRef[];
  readonly socketsOf: (showId: string) => IoSocket[];
  readonly watches: (socketId: string, showId: string) => boolean;
  readonly push: (model: ShowModel) => void;
  readonly join: (socket: IoSocket, me: Me | null, model: ShowModel) => void;
  readonly leave: (socket: IoSocket) => void;
}

/** Who watches which show, and how each of them gets the show's state. */
function watchingOf(shows: () => ShowService, people: People): Watching {
  // showId → socket id → watcher.
  const watching = new Map<string, Map<string, Watcher>>();

  const organisersOf = (showId: string): OrganiserRef[] => {
    const refs = new Map<string, OrganiserRef>();
    for (const { me } of watching.get(showId)?.values() ?? []) {
      if (me !== null && canDirect(me.role)) refs.set(me.id, { id: me.id, name: me.name });
    }
    return [...refs.values()];
  };

  // One watcher's projection: never more than its role may see.
  const send = ({ socket, me }: Watcher, model: ShowModel): void => {
    if (me !== null && canDirect(me.role)) {
      socket.emit('show:organiser', organiserView(model, organisersOf(model.id), people));
      return;
    }
    socket.emit('show:public', publicView(model, people));
    if (me?.role === 'player') socket.emit('show:personal', personalView(model, me));
  };

  const push = (model: ShowModel): void => {
    for (const watcher of watching.get(model.id)?.values() ?? []) send(watcher, model);
  };

  const directs = (me: Me | null): boolean => me !== null && canDirect(me.role);

  const leave = (socket: IoSocket): void => {
    for (const [showId, watchers] of watching) {
      const was = watchers.get(socket.id);
      if (was === undefined) continue;
      watchers.delete(socket.id);
      const model = shows().get(showId);
      // Only an organiser leaving changes what the others see (the hand-over list).
      if (model !== undefined && directs(was.me)) push(model);
    }
  };

  // A socket watches one show at a time; joining another leaves the first. Only an organiser
  // joining reaches everyone (the hand-over list); anyone else gets their own view only, so a
  // guest's repeated watch costs one send, never one per watcher (security pass 2, finding 3).
  const join = (socket: IoSocket, me: Me | null, model: ShowModel): void => {
    leave(socket);
    const watchers = watching.get(model.id) ?? new Map<string, Watcher>();
    const watcher = { socket, me };
    watchers.set(socket.id, watcher);
    watching.set(model.id, watchers);
    if (directs(me)) push(model);
    else send(watcher, model);
  };

  const socketsOf = (showId: string): IoSocket[] =>
    [...(watching.get(showId)?.values() ?? [])].map((w) => w.socket);
  const watches = (socketId: string, showId: string): boolean =>
    watching.get(showId)?.has(socketId) === true;

  return { organisersOf, socketsOf, watches, push, join, leave };
}

export interface RealtimeDeps {
  readonly app: FastifyInstance;
  readonly auth: Auth;
  readonly io: IoServer;
  readonly shows: () => ShowService;
}

// The session as it stands now, and whether the one the socket connected with has ended.
interface Current {
  readonly me: Me | null;
  readonly ended: boolean;
}

interface SocketData {
  me: Me | null;
  sessionId: string | null;
}

// Applause: counted per live show, sent to its watchers twice a second at most (./applause.ts).
function applauseOf(watching: Watching, shows: () => ShowService) {
  return applauseCounter({
    isLive: (showId) => shows().get(showId)?.state === 'live',
    watches: watching.watches,
    broadcast: (counted) => {
      for (const socket of watching.socketsOf(counted.showId))
        socket.emit('show:applause', counted);
    },
    now: () => Date.now(),
  });
}

export function attachRealtime({ app, auth, io, shows }: RealtimeDeps): Realtime {
  const watching = watchingOf(shows, auth.directory.lookup);
  const applause = applauseOf(watching, shows);

  // Guests connect too (they may watch, CONCEPT §2); `me` is null for them.
  io.use((socket, next) => {
    sessionFromHeader(app, auth, socket.handshake.headers.cookie)
      .then((current) => {
        const data = socket.data as SocketData;
        data.me = current?.me ?? null;
        data.sessionId = current?.session.id ?? null;
        next();
      })
      .catch(next);
  });

  // A session that ends takes its live connections with it.
  auth.ends.onEnd((ended) => {
    const gone = new Set(ended);
    for (const socket of io.sockets.sockets.values()) {
      const { sessionId } = socket.data as SocketData;
      if (sessionId !== null && gone.has(sessionId)) socket.disconnect(true);
    }
  });

  io.on('connection', (socket) => {
    const { me } = socket.data as SocketData;
    // At most 10 watches in 10 s per socket (security pass 2, finding 3).
    const watches = new RateLimiter({ limit: 10, windowMs: 10_000 });
    // The session as it is now, read again for every direction message (finding 5): one that
    // expired or was removed elsewhere (`pnpm sc admin reset-2fa`) closes the socket.
    const current = async (): Promise<Current> => {
      const now = await sessionFromHeader(app, auth, socket.handshake.headers.cookie);
      return { me: now?.me ?? null, ended: now === null && me !== null };
    };
    socket.on('show:watch', (request, ack) => {
      if (!watches.take(socket.id).allowed) {
        ack(refused('too many requests, wait a moment'));
        return;
      }
      const parsed = WatchRequestSchema.safeParse(request);
      const model = parsed.success ? shows().get(parsed.data.showId) : undefined;
      if (model === undefined) {
        ack(refused('there is no such show'));
        return;
      }
      ack({ ok: true });
      watching.join(socket, me, model);
    });
    directionHandlers(socket, current, shows, watching.organisersOf);
    socket.on('show:applaud', (request, ack) => {
      ack(applause.applaud(socket.id, request));
    });
    socket.on('disconnect', () => {
      watching.leave(socket);
    });
  });

  return { push: watching.push, stop: applause.stop };
}

/** The direction holder's messages; each is answered with an ack before anything else. */
function directionHandlers(
  socket: IoSocket,
  current: () => Promise<Current>,
  shows: () => ShowService,
  organisersOf: (showId: string) => OrganiserRef[],
): void {
  // Only a signed-in organiser or admin, as the session stands now, gets past this; the holder
  // check is the domain's.
  const guard = (ack: (a: Ack) => void, act: (me: Me) => Ack): void => {
    current().then(
      ({ me, ended }) => {
        ack(me === null || !canDirect(me.role) ? refused('only an organiser can direct') : act(me));
        // After the answer, so the client still learns why.
        if (ended) socket.disconnect(true);
      },
      () => {
        ack(refused('the session could not be checked, try again'));
      },
    );
  };
  socket.on('direction:select', (request, ack) => {
    guard(ack, (m) => {
      const p = SelectRequestSchema.safeParse(request);
      return p.success
        ? ackOf(shows().select(p.data.showId, m.id, p.data.caseNumber))
        : refused('which case?');
    });
  });
  socket.on('direction:step', (request, ack) => {
    guard(ack, (m) => {
      const p = StepRequestSchema.safeParse(request);
      return p.success
        ? ackOf(shows().step(p.data.showId, m.id, p.data.step))
        : refused('which step?');
    });
  });
  socket.on('direction:handOver', (request, ack) => {
    guard(ack, (m) => {
      const p = HandOverRequestSchema.safeParse(request);
      if (!p.success) return refused('to whom?');
      const to = organisersOf(p.data.showId).find((r) => r.id === p.data.toOrganiserId);
      if (to === undefined) return refused('that organiser is not watching this show');
      return ackOf(shows().handOver(p.data.showId, m.id, to));
    });
  });
  socket.on('direction:begin', (request, ack) => {
    guard(ack, (m) => {
      const p = ShowRequestSchema.safeParse(request);
      return p.success ? ackOf(shows().begin(p.data.showId, m.id)) : refused('which show?');
    });
  });
  socket.on('direction:end', (request, ack) => {
    guard(ack, (m) => {
      const p = ShowRequestSchema.safeParse(request);
      return p.success ? ackOf(shows().endShow(p.data.showId, m.id)) : refused('which show?');
    });
  });
}
