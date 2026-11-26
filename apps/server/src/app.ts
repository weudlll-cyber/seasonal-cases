/**
 * @file   apps/server/src/app.ts
 * @brief  Builds the server: Fastify with cookies and the kit's security headers, the routes under the base path,
 *         socket.io, the sign-in parts, the show service over the event log, and in production
 *         the built client.
 *
 * Responsibility: wire the ports (clock, ids, the secure and the seeded random source, the event
 *                 store, the account, session, credential and two-factor stores, the mailer, the
 *                 settings, the database probe) into the show service, the routes and the socket
 *                 side. Every route and the socket live under the base path (`/` locally,
 *                 `/games/cases/` in website mode, GAME-INTEGRATION §1). The development routes
 *                 exist only in local development mode; the website's sign-in, its account feed
 *                 and the profile card only in website mode; the standalone accounts only in
 *                 local mode. A session that ends closes its live connections (the kit's
 *                 SessionEnds). The socket accepts only same-origin handshakes, and every write
 *                 only same-origin requests with a JSON body (the kit's `writeCheck`, D69). ./main.ts listens on 127.0.0.1.
 * Depends on:     node:crypto, node:http (types), fastify, @fastify/cookie,
 *                 socket.io, @seasonal/kit/server, @sc/application, @sc/domain, ./auth/*,
 *                 ./accountDataRoutes.js, ./accountRoutes.js, ./addressLimit.js, ./config.js,
 *                 ./devRoutes.js,
 *                 ./healthRoutes.js, ./seasonSource.js,
 *                 ./http.js, ./localRoutes.js, ./mail.js, ./memberSummaryRoutes.js,
 *                 ./openRoundsRoutes.js, ./organiserRoutes.js, ./realtime.js, ./session.js,
 *                 ./settings.js, ./settingsRoutes.js, ./showRoutes.js, ./twoFactorRoutes.js,
 *                 ./web.js, ./websiteRoutes.js
 */
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import cookie from '@fastify/cookie';
import { securityHeadersHook, SessionEnds, sessionCookie, writeCheck } from '@seasonal/kit/server';
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

import { accountDataRoutes } from './accountDataRoutes.js';
import { forgetDeleted } from './auth/erasure.js';
import { accountRoutes } from './accountRoutes.js';
import {
  addressLimit,
  CLAIM_ADDRESS_LIMIT,
  SIGN_IN_ADDRESS_LIMIT,
  type AddressLimit,
} from './addressLimit.js';
import { memoryCursor, startFeed, type CursorStore } from './auth/accountFeed.js';
import { Directory, memoryAccounts, type AccountStore } from './auth/accounts.js';
import { memoryCredentials, type CredentialStore } from './auth/credentials.js';
import { memoryPending, type PendingStore } from './auth/pending.js';
import { memorySessions, type SessionStore } from './auth/sessions.js';
import { memoryTwoFactor, type TwoFactorStore } from './auth/twoFactor.js';
import { servedOverHttps, type ServerConfig } from './config.js';
import { devRoutes } from './devRoutes.js';
import { healthRoutes, type Probe } from './healthRoutes.js';
import { handleRefusals, type Ctx } from './http.js';
import { localRoutes } from './localRoutes.js';
import { memberSummaryRoutes } from './memberSummaryRoutes.js';
import { smtpMailer, type Mailer } from './mail.js';
import { openRoundsRoutes } from './openRoundsRoutes.js';
import { organiserRoutes } from './organiserRoutes.js';
import { attachRealtime } from './realtime.js';
import { seasonSource } from './seasonSource.js';
import type { Auth } from './session.js';
import { CurrentSettings, memorySettings, type SettingsStore } from './settings.js';
import { settingsRoutes } from './settingsRoutes.js';
import { showRoutes } from './showRoutes.js';
import { twoFactorRoutes } from './twoFactorRoutes.js';
import { headersOf, loggerOptions, serveClient } from './web.js';
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
  readonly pending?: PendingStore;
  readonly twoFactor?: TwoFactorStore;
  readonly settings?: SettingsStore;
  // Whether the database answers (`/readyz`); none without a database.
  readonly probe?: Probe;
  // The outgoing mail; by default SMTP from the settings, or none.
  readonly mailer?: Mailer | null;
  // The sign-ins' cap per address; by default 20 a minute (D45). Tests count what reaches it.
  readonly signInCap?: AddressLimit;
}

export interface BuiltServer {
  readonly app: FastifyInstance;
  readonly shows: ShowService;
  readonly auth: Auth;
  readonly io: Server<ClientToServerEvents, ServerToClientEvents>;
}

/**
 * The kit's CSRF check (`writeCheck`, kit K60; D69) on every request that writes: the browser names
 * where it came from (`Sec-Fetch-Site`, `Origin`) and that is this site; a write that names neither
 * is refused. Behind the website's proxy the forwarded host counts only from a trusted peer.
 */
function guardWrites(app: FastifyInstance, check: ReturnType<typeof writeCheck>): void {
  app.addHook('onRequest', (request, reply, done) => {
    const { method, headers, socket } = request.raw;
    if (!check({ method: method ?? 'GET', headers, peer: socket.remoteAddress }).ok) {
      void reply.code(403).send({ error: 'this request came from another site' });
      return;
    }
    done();
  });
}

/** The socket's upgrade carries the visitor's cookie too: it is judged as a write. */
const ownSite = (check: ReturnType<typeof writeCheck>, request: IncomingMessage): boolean =>
  check({ method: 'POST', headers: request.headers, peer: request.socket.remoteAddress }).ok;

async function authOf(app: FastifyInstance, config: ServerConfig, stores: Stores): Promise<Auth> {
  const accounts = stores.accounts ?? memoryAccounts();
  return {
    accounts,
    sessions: stores.sessions ?? memorySessions(),
    twoFactor: stores.twoFactor ?? memoryTwoFactor(),
    recoveryKey: config.recoveryKey,
    directory: await Directory.load(accounts),
    ends: new SessionEnds((error) => {
      app.log.error(error);
    }),
    cookie: sessionCookie({
      name: 'sc_session',
      // Secure whenever the game is served over https (security pass, finding 4).
      secure: servedOverHttps(config),
      basePath: config.basePath,
    }),
    devAccounts: config.dev,
    now: () => Date.now(),
  };
}

// Every route under the base path, each group only in the mode it belongs to.
async function routes(root: Ctx, stores: Stores, settings: CurrentSettings): Promise<void> {
  const { config } = root;
  const mailer = stores.mailer ?? (config.smtp === null ? null : smtpMailer(config.smtp));
  // A budget per address for sign-ins and one for claims, each its own (D45).
  const signIns = stores.signInCap ?? addressLimit(SIGN_IN_ADDRESS_LIMIT);
  const claims = addressLimit(CLAIM_ADDRESS_LIMIT);
  const local = {
    credentials: stores.credentials ?? memoryCredentials(),
    pending: stores.pending ?? memoryPending(),
    perAddress: signIns,
    mailer,
    publicOrigin: config.publicOrigin,
    log: (error: unknown) => {
      root.app.log.error(error);
    },
  };
  await root.app.register(
    (scope, _options, done) => {
      const ctx: Ctx = { ...root, app: scope };
      showRoutes(ctx, claims);
      organiserRoutes(ctx);
      accountRoutes(ctx);
      openRoundsRoutes(ctx);
      settingsRoutes(ctx, settings);
      healthRoutes(ctx, stores.probe ?? null);
      if (config.dev) devRoutes(ctx);
      if (config.website === null) {
        localRoutes(ctx, local);
        accountDataRoutes(ctx, local);
        twoFactorRoutes(ctx, local.credentials);
      } else {
        websiteRoutes(ctx, config.website);
        // The profile card needs the games' sync token, the same as the feed (§7).
        const feed = config.website.feed;
        if (feed !== null) memberSummaryRoutes(ctx, config.website.origin, feed.syncToken);
      }
      done();
    },
    { prefix: config.basePath.replace(/\/$/, '') },
  );
}

/**
 * Starts the website's account feed (website mode only). A deleted member is erased with the same
 * routine as a standalone deletion, and the shows forget the name (D61).
 */
function launchFeed(ctx: Ctx, stores: Stores): () => void {
  const { app, auth, shows, config } = ctx;
  const feed = config.website?.feed;
  if (feed === null || feed === undefined) return () => undefined;
  return startFeed(
    {
      ...auth,
      websiteOrigin: config.website?.origin ?? '',
      forget: (playerId, name) => shows.forget(playerId, name),
    },
    feed,
    stores.cursor ?? memoryCursor(),
    (e) => {
      app.log.error(e);
    },
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
  const check = writeCheck({ trustedProxies: config.proxies });
  guardWrites(app, check);
  app.addHook('onRequest', securityHeadersHook(headersOf(config)));
  await app.register(cookie, { secret: config.cookieSecret });
  handleRefusals(app);
  const auth = await authOf(app, config, stores);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
    path: `${config.basePath}socket.io`,
    allowRequest: (request, callback) => {
      callback(null, ownSite(check, request));
    },
  });
  // The service tells the socket side of every change; the socket side reads the service
  // (only once a socket connects, after both exist).
  const { proxies } = config;
  const realtime = attachRealtime({ app, auth, io, shows: () => shows, proxies });
  const settings = await CurrentSettings.load(stores.settings ?? memorySettings());
  // Website mode: new shows take the website's season (./seasonSource.ts).
  // A website that does not answer is expected now and then: a warning, the date's season stays.
  const season = seasonSource(config.website, (e) => {
    app.log.warn(e);
  });
  const shows: ShowService = createShowService({
    clock: { now: () => new Date().toISOString() },
    ids: { showId: () => `show-${randomUUID().slice(0, 8)}` },
    random: RANDOM,
    settings: settings.now,
    seasonAt: season.seasonAt,
    store: stores.events ?? jsonlStore(config.dataDir),
    onChange: (model) => {
      realtime.push(model);
    },
  });
  // A crash between a deletion's two steps leaves a name in the log: do the second again (D61).
  await forgetDeleted(auth.accounts, (playerId, name) => shows.forget(playerId, name));
  await routes({ app, auth, shows, config }, stores, settings);
  // In production the same process serves the built client (SC-N3 piece 2).
  await serveClient(app, config);
  const stopFeed = launchFeed({ app, auth, shows, config }, stores);
  app.addHook('onClose', async () => {
    stopFeed();
    season.stop();
    realtime.stop();
    await io.close();
  });
  return { app, shows, auth, io };
}
