/**
 * @file   apps/server/src/app.ts
 * @brief  Builds the server: Fastify with cookies and helmet, the routes under the base path,
 *         socket.io, the sign-in parts and the show service over the event log.
 *
 * Responsibility: wire the ports (clock, ids, the secure and the seeded random source, the
 *                 JSON-lines store, the account and session stores) into the show service, the
 *                 routes and the socket side. Every route and the socket live under the base path
 *                 (`/` locally, `/games/cases/` in website mode, GAME-INTEGRATION §1). The
 *                 development routes exist only in local development mode, the website's sign-in
 *                 and its account feed only in website mode. A session that ends closes its live
 *                 connections (the kit's SessionEnds). The socket accepts only same-origin
 *                 handshakes. ./main.ts listens on 127.0.0.1.
 * Depends on:     node:crypto, node:http (types), fastify, @fastify/cookie, @fastify/helmet,
 *                 socket.io, @seasonal/kit/server, @sc/application, @sc/domain, ./auth/*,
 *                 ./config.js, ./devRoutes.js, ./http.js, ./organiserRoutes.js, ./realtime.js,
 *                 ./session.js, ./showRoutes.js, ./websiteRoutes.js
 */
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { SessionEnds } from '@seasonal/kit/server';
import {
  createShowService,
  jsonlStore,
  type EventStore,
  type RandomSource,
  type ShowService,
} from '@sc/application';
import type { ClientToServerEvents, ServerToClientEvents } from '@sc/contracts';
import { seededRandom } from '@sc/domain';
import Fastify, { type FastifyInstance } from 'fastify';
import { Server } from 'socket.io';

import { memoryCursor, startFeed, type CursorStore } from './auth/accountFeed.js';
import { Directory, memoryAccounts, type AccountStore } from './auth/accounts.js';
import { memorySessions, type SessionStore } from './auth/sessions.js';
import type { ServerConfig } from './config.js';
import { devRoutes } from './devRoutes.js';
import { handleRefusals, type Ctx } from './http.js';
import { organiserRoutes } from './organiserRoutes.js';
import { attachRealtime } from './realtime.js';
import type { Auth } from './session.js';
import { showRoutes } from './showRoutes.js';
import { websiteRoutes } from './websiteRoutes.js';

// Production randomness: node:crypto, never Math.random (CONCEPT §8).
const RANDOM: RandomSource = {
  secure: () => ({
    int: (max) => randomInt(max),
    hex: (bytes) => randomBytes(bytes).toString('hex'),
  }),
  seeded: seededRandom,
};

export interface Stores {
  readonly events?: EventStore;
  readonly accounts?: AccountStore;
  readonly sessions?: SessionStore;
  readonly cursor?: CursorStore;
}

export interface BuiltServer {
  readonly app: FastifyInstance;
  readonly shows: ShowService;
  readonly auth: Auth;
  readonly io: Server<ClientToServerEvents, ServerToClientEvents>;
}

// Through the proxy the Origin's host equals the Host header; anything else is a cross-site page
// trying to open a socket with the visitor's cookie.
function sameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

async function authOf(app: FastifyInstance, config: ServerConfig, stores: Stores): Promise<Auth> {
  const accounts = stores.accounts ?? memoryAccounts();
  return {
    accounts,
    sessions: stores.sessions ?? memorySessions(),
    directory: await Directory.load(accounts),
    ends: new SessionEnds((error) => {
      app.log.error(error);
    }),
    cookiePath: config.basePath,
    secure: config.mode === 'website',
    now: () => Date.now(),
  };
}

export async function buildServer(config: ServerConfig, stores: Stores = {}): Promise<BuiltServer> {
  const app = Fastify({ logger: false });
  await app.register(helmet);
  await app.register(cookie, { secret: config.cookieSecret });
  handleRefusals(app);
  const auth = await authOf(app, config, stores);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
    path: `${config.basePath}socket.io`,
    allowRequest: (request, callback) => {
      callback(null, sameOrigin(request));
    },
  });
  // The service tells the socket side of every change; the socket side reads the service
  // (only once a socket connects, after both exist).
  const realtime = attachRealtime({ app, auth, io, shows: () => shows });
  const shows: ShowService = createShowService({
    clock: { now: () => new Date().toISOString() },
    ids: { showId: () => `show-${randomUUID().slice(0, 8)}` },
    random: RANDOM,
    store: stores.events ?? jsonlStore(config.dataDir),
    onChange: (model) => {
      realtime.push(model);
    },
  });
  const prefix = config.basePath.replace(/\/$/, '');
  await app.register(
    (scope, _options, done) => {
      const ctx: Ctx = { app: scope, auth, shows, config };
      showRoutes(ctx);
      organiserRoutes(ctx);
      if (config.dev) devRoutes(ctx);
      if (config.website !== null) websiteRoutes(ctx, config.website);
      done();
    },
    { prefix },
  );
  const feed = config.website?.feed;
  const stopFeed =
    feed === null || feed === undefined
      ? () => undefined
      : startFeed(
          { ...auth, websiteOrigin: config.website?.origin ?? '' },
          feed,
          stores.cursor ?? memoryCursor(),
          (e) => {
            app.log.error(e);
          },
        );
  app.addHook('onClose', async () => {
    stopFeed();
    await io.close();
  });
  return { app, shows, auth, io };
}
