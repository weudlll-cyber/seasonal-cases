/**
 * @file   apps/server/src/testing/harness.ts
 * @brief  Test harness: a listening server, signed-in users, sockets.
 *
 * Responsibility: start the real server on 127.0.0.1 with a free port and in-memory stores (no
 *                 files, no mail, nothing to clean up), in local development mode by default or
 *                 with the environment and stores a test gives (website mode, a mailbox, say); sign users in through the dev
 *                 route, and connect socket.io clients with their cookie. Used by tests only.
 * Depends on:     socket.io-client, @sc/application, @sc/contracts (types), ../app.js,
 *                 ../config.js
 */
import { memoryStore } from '@sc/application';
import type { Ack, ClientToServerEvents, Me, Role, ServerToClientEvents } from '@sc/contracts';
import { io as connect, type Socket } from 'socket.io-client';

import { buildServer, type BuiltServer, type Stores } from '../app.js';
import { configFrom } from '../config.js';

export type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface Harness {
  readonly server: BuiltServer;
  readonly url: string;
  signIn(name: string, role: Role, rank?: number): Promise<{ me: Me; cookie: string }>;
  socket(cookie?: string, origin?: string): Promise<Client>;
  close(): Promise<void>;
}

const DEV_ENV = { NODE_ENV: 'development', SC_DEV: '1' };

/** A server with the given environment and stores; `dev` false: no development features. */
export async function startHarness(
  dev = true,
  env: NodeJS.ProcessEnv = {},
  stores: Stores = {},
): Promise<Harness> {
  const config = configFrom({
    ...(dev ? DEV_ENV : {}),
    SC_COOKIE_SECRET: 'test-secret-'.repeat(4),
    SC_PORT: '0',
    ...env,
  });
  const server = await buildServer(config, { events: memoryStore(), mailer: null, ...stores });
  const address = await server.app.listen({ host: '127.0.0.1', port: 0 });
  const sockets: Client[] = [];
  return {
    server,
    url: address,
    async signIn(name, role, rank = 0) {
      const response = await server.app.inject({
        method: 'POST',
        url: '/api/dev/sign-in',
        payload: { name, role, rank },
      });
      const set = response.headers['set-cookie'];
      const raw = Array.isArray(set) ? set[0] : set;
      if (raw === undefined) throw new Error(`sign-in failed: ${response.body}`);
      return { me: response.json<Me>(), cookie: raw.split(';')[0] ?? '' };
    },
    socket(cookie, origin = address) {
      const socket: Client = connect(address, {
        path: `${config.basePath}socket.io`,
        transports: ['websocket'],
        extraHeaders: { ...(cookie === undefined ? {} : { cookie }), origin },
        forceNew: true,
      });
      sockets.push(socket);
      return new Promise((resolve, reject) => {
        socket.once('connect', () => {
          resolve(socket);
        });
        socket.once('connect_error', reject);
      });
    },
    async close() {
      for (const s of sockets) s.disconnect();
      await server.app.close();
    },
  };
}

/** Sends one socket message and waits for its ack. */
export function send(
  socket: Client,
  event: keyof ClientToServerEvents,
  payload: unknown,
): Promise<Ack> {
  return new Promise((resolve) => {
    socket.emit(event, payload, resolve);
  });
}
