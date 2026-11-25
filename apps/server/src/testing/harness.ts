/**
 * @file   apps/server/src/testing/harness.ts
 * @brief  Test harness: a listening server, signed-in users, sockets.
 *
 * Responsibility: start the real server on 127.0.0.1 with a free port and in-memory stores (no
 *                 files, mail kept in a list, nothing to clean up), in local development mode by
 *                 default or with the environment and stores a test gives (website mode, a
 *                 mailbox, say); sign users in through the dev route; register a standalone
 *                 account through its confirmation link (D42); and connect socket.io clients with
 *                 their cookie. Its requests name themselves as a browser's own page's do (the
 *                 CSRF check refuses a write that names nothing, D69). Used by tests only.
 * Depends on:     socket.io-client, @sc/application, @sc/contracts (types), ../app.js,
 *                 ../config.js, ../mail.js
 */
import { memoryStore } from '@sc/application';
import type { Ack, ClientToServerEvents, Me, Role, ServerToClientEvents } from '@sc/contracts';
import type { InjectOptions } from 'fastify';
import { io as connect, type Socket } from 'socket.io-client';

import { buildServer, type BuiltServer, type Stores } from '../app.js';
import { configFrom } from '../config.js';
import { mailbox } from '../mail.js';

export type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface Harness {
  readonly server: BuiltServer;
  readonly url: string;
  signIn(name: string, role: Role, rank?: number): Promise<{ me: Me; cookie: string }>;
  // Registers the form and uses the link of its mail (D42); answers the confirmation's status.
  register(form: { name: string; email: string; password: string }): Promise<number>;
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
    // A test says only what fails.
    SC_LOG_LEVEL: 'error',
    SC_PORT: '0',
    ...env,
  });
  // The test's own mailer, or a list of the mails, so a registration's link can be followed.
  const own = mailbox();
  const mailer = stores.mailer === undefined ? own : stores.mailer;
  const box = mailer !== null && 'sent' in mailer ? (mailer as typeof own) : own;
  const server = await buildServer(config, { events: memoryStore(), ...stores, mailer });
  asBrowser(server);
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
    register: (form) => registerThrough(server, config.basePath, box, form),
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

/**
 * A page's own request carries `Sec-Fetch-Site: same-origin`; so does every injected one, unless
 * the test names an origin or a fetch site itself.
 */
function asBrowser({ app }: BuiltServer): void {
  const inject = app.inject.bind(app) as (options: InjectOptions) => unknown;
  const own = (options: InjectOptions): unknown => {
    const headers = options.headers ?? {};
    const named = 'origin' in headers || 'sec-fetch-site' in headers;
    return inject(
      named ? options : { ...options, headers: { ...headers, 'sec-fetch-site': 'same-origin' } },
    );
  };
  Object.assign(app, { inject: own });
}

/** Registers the form and posts the token of its mail's link; answers the last status. */
async function registerThrough(
  server: BuiltServer,
  base: string,
  box: { readonly sent: { to: string; text: string }[] },
  form: { name: string; email: string; password: string },
): Promise<number> {
  const post = (path: string, payload: object) =>
    server.app.inject({ method: 'POST', url: `${base}api/auth/${path}`, payload });
  const asked = await post('register', form);
  if (asked.statusCode !== 200) return asked.statusCode;
  return (await post('confirm', { token: await linkOf(box, form.email) })).statusCode;
}

/** The token of the newest confirmation link mailed to the address (the mail is sent after the
 *  answer, so it is waited for). */
async function linkOf(box: { readonly sent: { to: string; text: string }[] }, email: string) {
  for (let i = 0; i < 100; i += 1) {
    const mail = box.sent.filter((m) => m.to === email).at(-1);
    const token = mail === undefined ? undefined : /confirm#token=([\w-]+)/.exec(mail.text)?.[1];
    if (token !== undefined) return token;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`no confirmation link for ${email}`);
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
