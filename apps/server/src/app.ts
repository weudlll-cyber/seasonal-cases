/**
 * @file   apps/server/src/app.ts
 * @brief  Builds the server: Fastify with cookies and helmet, the routes, socket.io and the
 *         show service over the event log.
 *
 * Responsibility: wire the ports (clock, ids, the secure and the seeded random source, the
 *                 JSON-lines store) into the show service, the routes and the socket side. The
 *                 development routes exist only in development mode (./config.ts). The socket
 *                 accepts only same-origin handshakes. ./main.ts listens on 127.0.0.1.
 * Depends on:     node:crypto, fastify, @fastify/cookie, @fastify/helmet, socket.io,
 *                 @sc/application, @sc/domain, ./config.js, ./devRoutes.js, ./showRoutes.js,
 *                 ./realtime.js, ./http.js
 */
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
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

import type { ServerConfig } from './config.js';
import { devRoutes } from './devRoutes.js';
import { handleRefusals } from './http.js';
import { attachRealtime } from './realtime.js';
import { showRoutes } from './showRoutes.js';

// Production randomness: node:crypto, never Math.random (CONCEPT §8).
const RANDOM: RandomSource = {
  secure: () => ({
    int: (max) => randomInt(max),
    hex: (bytes) => randomBytes(bytes).toString('hex'),
  }),
  seeded: seededRandom,
};

export interface BuiltServer {
  readonly app: FastifyInstance;
  readonly shows: ShowService;
  readonly io: Server<ClientToServerEvents, ServerToClientEvents>;
}

// Through the client's proxy the Origin's host equals the Host header; anything else is a
// cross-site page trying to open a socket with the visitor's cookie.
function sameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

export async function buildServer(config: ServerConfig, store?: EventStore): Promise<BuiltServer> {
  const app = Fastify({ logger: false });
  await app.register(helmet);
  await app.register(cookie, { secret: config.cookieSecret });
  handleRefusals(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
    allowRequest: (request, callback) => {
      callback(null, sameOrigin(request));
    },
  });
  // The service tells the socket side of every change; the socket side reads the service
  // (only once a socket connects, after both exist).
  const realtime = attachRealtime(app, io, () => shows);
  const shows: ShowService = createShowService({
    clock: { now: () => new Date().toISOString() },
    ids: { showId: () => `show-${randomUUID().slice(0, 8)}` },
    random: RANDOM,
    store: store ?? jsonlStore(config.dataDir),
    onChange: (model) => {
      realtime.push(model);
    },
  });

  showRoutes(app, shows);
  if (config.dev) devRoutes(app, shows);
  app.addHook('onClose', async () => {
    await io.close();
  });
  return { app, shows, io };
}
