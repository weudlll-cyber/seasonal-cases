/**
 * @file   apps/server/src/app.ts
 * @brief  Builds the server: Fastify with cookies and helmet, the routes under the base path,
 *         socket.io, the sign-in parts and the show service over the event log.
 *
 * Responsibility: wire the ports (clock, ids, the secure and the seeded random source, the
 *                 JSON-lines store, the account, session and credential stores, the mailer, the
 *                 settings) into the show service, the routes and the socket side. Every route and the socket live under the base path
 *                 (`/` locally, `/games/cases/` in website mode, GAME-INTEGRATION §1). The
 *                 development routes exist only in local development mode, the website's sign-in
 *                 and its account feed only in website mode, the standalone accounts only in local
 *                 mode. A session that ends closes its live
 *                 connections (the kit's SessionEnds). The socket accepts only same-origin
 *                 handshakes, and every write only same-origin requests with a JSON body. ./main.ts listens on 127.0.0.1.
 * Depends on:     node:crypto, node:http (types), fastify, @fastify/cookie, @fastify/helmet,
 *                 socket.io, @seasonal/kit/server, @sc/application, @sc/domain, ./auth/*,
 *                 ./accountRoutes.js, ./config.js, ./devRoutes.js, ./http.js, ./localRoutes.js,
 *                 ./mail.js, ./openRoundsRoutes.js, ./organiserRoutes.js, ./realtime.js, ./session.js, ./settings.js,
 *                 ./settingsRoutes.js, ./showRoutes.js, ./twoFactorRoutes.js, ./websiteRoutes.js
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
import Fastify, { LogController, type FastifyInstance } from 'fastify';
import { Server } from 'socket.io';

import { accountRoutes } from './accountRoutes.js';
import { memoryCursor, startFeed, type CursorStore } from './auth/accountFeed.js';
import { Directory, memoryAccounts, type AccountStore } from './auth/accounts.js';
import { memoryCredentials, type CredentialStore } from './auth/credentials.js';
import { memorySessions, type SessionStore } from './auth/sessions.js';
import { memoryTwoFactor, type TwoFactorStore } from './auth/twoFactor.js';
import type { ServerConfig } from './config.js';
import { devRoutes } from './devRoutes.js';
import { healthRoutes, type Probe } from './healthRoutes.js';
import { handleRefusals, type Ctx } from './http.js';
import { localRoutes } from './localRoutes.js';
import { smtpMailer, type Mailer } from './mail.js';
import { openRoundsRoutes } from './openRoundsRoutes.js';
import { organiserRoutes } from './organiserRoutes.js';
import { attachRealtime } from './realtime.js';
import type { Auth } from './session.js';
import { CurrentSettings, memorySettings, type SettingsStore } from './settings.js';
import { settingsRoutes } from './settingsRoutes.js';
import { showRoutes } from './showRoutes.js';
import { twoFactorRoutes } from './twoFactorRoutes.js';
import { helmetOptions, loggerOptions, serveClient } from './web.js';
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
  readonly credentials?: CredentialStore;
  readonly twoFactor?: TwoFactorStore;
  readonly settings?: SettingsStore;
  // Whether the database answers (`/api/health`, `/api/ready`); none without a database.
  readonly probe?: Probe;
  // The outgoing mail; by default SMTP from the settings, or none.
  readonly mailer?: Mailer | null;
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

/**
 * Refuses a write (anything but GET, HEAD, OPTIONS) that another site's page sends with the
 * visitor's cookie: the browser names the page's origin and its relation (security pass, 3).
 * Through the proxy the Origin's host equals the Host header, as for the socket.
 */
function sameSiteWrites(app: FastifyInstance): void {
  app.addHook('onRequest', (request, reply, done) => {
    const site = request.headers['sec-fetch-site'];
    const crossSite = site !== undefined && site !== 'same-origin' && site !== 'none';
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (write && (crossSite || !sameOrigin(request.raw))) {
      void reply.code(403).send({ error: 'this request came from another site' });
      return;
    }
    done();
  });
}

async function authOf(app: FastifyInstance, config: ServerConfig, stores: Stores): Promise<Auth> {
  const accounts = stores.accounts ?? memoryAccounts();
  return {
    accounts,
    sessions: stores.sessions ?? memorySessions(),
    twoFactor: stores.twoFactor ?? memoryTwoFactor(),
    directory: await Directory.load(accounts),
    ends: new SessionEnds((error) => {
      app.log.error(error);
    }),
    cookiePath: config.basePath,
    // Secure whenever the public address is https (security pass, finding 4); only plain
    // http://localhost development goes without.
    secure: config.mode === 'website' || config.publicOrigin.startsWith('https:'),
    devAccounts: config.dev,
    now: () => Date.now(),
  };
}

// Every route under the base path, each group only in the mode it belongs to.
async function routes(root: Ctx, stores: Stores, settings: CurrentSettings): Promise<void> {
  const { config } = root;
  const mailer = stores.mailer ?? (config.smtp === null ? null : smtpMailer(config.smtp));
  const local = {
    credentials: stores.credentials ?? memoryCredentials(),
    mailer,
    publicOrigin: config.publicOrigin,
    log: (error: unknown) => {
      root.app.log.error(error);
    },
  };
  await root.app.register(
    (scope, _options, done) => {
      const ctx: Ctx = { ...root, app: scope };
      showRoutes(ctx);
      organiserRoutes(ctx);
      accountRoutes(ctx);
      openRoundsRoutes(ctx);
      settingsRoutes(ctx, settings);
      healthRoutes(ctx, stores.probe ?? null);
      if (config.dev) devRoutes(ctx);
      if (config.website === null) {
        localRoutes(ctx, local);
        twoFactorRoutes(ctx);
      } else websiteRoutes(ctx, config.website);
      done();
    },
    { prefix: config.basePath.replace(/\/$/, '') },
  );
}

export async function buildServer(config: ServerConfig, stores: Stores = {}): Promise<BuiltServer> {
  // JSON lines without cookies, tokens or bodies (./web.ts); the visitor's address from
  // X-Forwarded-For, trusted only from the configured proxies (security pass, 1 and 5).
  const app = Fastify({
    logger: loggerOptions(config),
    // One line per request in production only; development stays readable.
    logController: new LogController({ disableRequestLogging: !config.production }),
    trustProxy: [...config.proxies],
  });
  // JSON bodies only: a plain HTML form (text/plain) from another page cannot reach a route.
  app.removeContentTypeParser('text/plain');
  sameSiteWrites(app);
  await app.register(helmet, helmetOptions(config));
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
  const settings = await CurrentSettings.load(stores.settings ?? memorySettings());
  const shows: ShowService = createShowService({
    clock: { now: () => new Date().toISOString() },
    ids: { showId: () => `show-${randomUUID().slice(0, 8)}` },
    random: RANDOM,
    settings: settings.now,
    store: stores.events ?? jsonlStore(config.dataDir),
    onChange: (model) => {
      realtime.push(model);
    },
  });
  await routes({ app, auth, shows, config }, stores, settings);
  // In production the same process serves the built client (SC-N3 piece 2).
  await serveClient(app, config);
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
