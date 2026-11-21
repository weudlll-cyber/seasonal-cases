/**
 * @file   apps/server/src/realtime.ts
 * @brief  The socket side: watching a show, the pushed projections, the direction's actions.
 *
 * Responsibility: a socket watches one show. Moderators and admins receive the moderator view,
 *                 everyone else the public view, players also their personal view; a client
 *                 never receives more than its projection (CONCEPT §8). Every direction message
 *                 is checked against the session and, in the domain, against the direction
 *                 holder, and acknowledged at once. A change of a show is pushed to its watchers.
 * Depends on:     socket.io, fastify, @sc/application (types), @sc/contracts, @sc/domain,
 *                 ./session.js
 */
import type { Outcome, ShowService } from '@sc/application';
import {
  canModerate,
  HandOverRequestSchema,
  SelectRequestSchema,
  ShowRequestSchema,
  StepRequestSchema,
  WatchRequestSchema,
  type Ack,
  type ClientToServerEvents,
  type Me,
  type ModeratorRef,
  type ServerToClientEvents,
} from '@sc/contracts';
import { moderatorView, personalView, publicView, type ShowModel } from '@sc/domain';
import type { FastifyInstance } from 'fastify';
import type { Server, Socket } from 'socket.io';

import { sessionFromHeader } from './session.js';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface Watcher {
  readonly socket: IoSocket;
  readonly me: Me | null;
}

export interface Realtime {
  /** Sends the show's new state to everyone watching it, each their projection. */
  push(model: ShowModel): void;
}

const refused = (error: string): Ack => ({ ok: false, error });
const ackOf = (outcome: Outcome): Ack => (outcome.ok ? { ok: true } : refused(outcome.error));

interface Watching {
  readonly moderatorsOf: (showId: string) => ModeratorRef[];
  readonly push: (model: ShowModel) => void;
  readonly join: (socket: IoSocket, me: Me | null, model: ShowModel) => void;
  readonly leave: (socket: IoSocket) => void;
}

/** Who watches which show, and how each of them gets the show's state. */
function watchingOf(shows: () => ShowService): Watching {
  // showId → socket id → watcher.
  const watching = new Map<string, Map<string, Watcher>>();

  const moderatorsOf = (showId: string): ModeratorRef[] => {
    const refs = new Map<string, ModeratorRef>();
    for (const { me } of watching.get(showId)?.values() ?? []) {
      if (me !== null && canModerate(me.role)) refs.set(me.id, { id: me.id, name: me.name });
    }
    return [...refs.values()];
  };

  // One watcher's projection: never more than its role may see.
  const send = ({ socket, me }: Watcher, model: ShowModel): void => {
    if (me !== null && canModerate(me.role)) {
      socket.emit('show:moderator', moderatorView(model, moderatorsOf(model.id)));
      return;
    }
    socket.emit('show:public', publicView(model));
    if (me?.role === 'player') socket.emit('show:personal', personalView(model, me));
  };

  const push = (model: ShowModel): void => {
    for (const watcher of watching.get(model.id)?.values() ?? []) send(watcher, model);
  };

  const leave = (socket: IoSocket): void => {
    for (const [showId, watchers] of watching) {
      if (!watchers.delete(socket.id)) continue;
      const model = shows().get(showId);
      // The moderators' hand-over list changes when a moderator leaves.
      if (model !== undefined) push(model);
    }
  };

  // A socket watches one show at a time; joining another leaves the first.
  const join = (socket: IoSocket, me: Me | null, model: ShowModel): void => {
    leave(socket);
    const watchers = watching.get(model.id) ?? new Map<string, Watcher>();
    watchers.set(socket.id, { socket, me });
    watching.set(model.id, watchers);
    push(model);
  };

  return { moderatorsOf, push, join, leave };
}

export function attachRealtime(
  app: FastifyInstance,
  io: IoServer,
  shows: () => ShowService,
): Realtime {
  const watching = watchingOf(shows);

  // Guests connect too (they may watch, CONCEPT §2); `me` is null for them.
  io.use((socket, next) => {
    (socket.data as { me: Me | null }).me = sessionFromHeader(app, socket.handshake.headers.cookie);
    next();
  });

  io.on('connection', (socket) => {
    const me = (socket.data as { me: Me | null }).me;
    socket.on('show:watch', (request, ack) => {
      const parsed = WatchRequestSchema.safeParse(request);
      const model = parsed.success ? shows().get(parsed.data.showId) : undefined;
      if (model === undefined) {
        ack(refused('there is no such show'));
        return;
      }
      ack({ ok: true });
      watching.join(socket, me, model);
    });
    directionHandlers(socket, me, shows, watching.moderatorsOf);
    socket.on('disconnect', () => {
      watching.leave(socket);
    });
  });

  return { push: watching.push };
}

/** The direction holder's messages; each is answered with an ack before anything else. */
function directionHandlers(
  socket: IoSocket,
  me: Me | null,
  shows: () => ShowService,
  moderatorsOf: (showId: string) => ModeratorRef[],
): void {
  // Only a signed-in moderator or admin gets past this; the holder check is the domain's.
  const guard = (ack: (a: Ack) => void, act: (me: Me) => Ack): void => {
    ack(me === null || !canModerate(me.role) ? refused('only a moderator can direct') : act(me));
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
      const to = moderatorsOf(p.data.showId).find((r) => r.id === p.data.toModeratorId);
      if (to === undefined) return refused('that moderator is not watching this show');
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
