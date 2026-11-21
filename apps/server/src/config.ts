/**
 * @file   apps/server/src/config.ts
 * @brief  The server's settings from the environment, for local and website mode.
 *
 * Responsibility: the port (SC_PORT, default 3970); the mode (SC_MODE `local` or `website`,
 *                 GAME-INTEGRATION §1) and its base path (`/` or `/games/cases/`); whether the
 *                 development features exist (NODE_ENV=development and SC_DEV=1, local mode
 *                 only, CONCEPT §10); the database (DATABASE_URL, with the data key SC_DATA_KEY
 *                 that encrypts secrets at rest) or, without one, the event-log folder
 *                 (SC_DATA_DIR) and memory for accounts and sessions; the cookie secret
 *                 (SC_COOKIE_SECRET, else a new random one per start); in website mode the
 *                 trusted proxies (SC_TRUSTED_PROXIES, a comma list), the proxy secret
 *                 (SC_PROXY_SECRET, header `X-Sc-Proxy-Secret`), the website's origin
 *                 (SC_WEBSITE_ORIGIN) and, for the account-changes feed, its local origin and the
 *                 games' sync token (SC_WEBSITE_LOCAL_ORIGIN, SC_GAMES_SYNC_TOKEN); in local
 *                 mode an optional chat origin to frame (SC_CHAT_ORIGIN, development), the SMTP
 *                 relay for the forgotten-password mail (SC_SMTP_HOST, SC_SMTP_PORT, SC_MAIL_FROM)
 *                 and the address its link opens (SC_PUBLIC_ORIGIN; the dev client only in
 *                 development); the proxies whose X-Forwarded-For names the visitor
 *                 (SC_TRUSTED_PROXIES in both modes; locally this machine by default). Website
 *                 mode without its trust settings refuses to start.
 * Depends on:     node:crypto, node:url, ./mail.js (types)
 */
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import type { SmtpConfig } from './mail.js';

export type Mode = 'local' | 'website';

export interface WebsiteConfig {
  readonly trustedProxies: readonly string[];
  readonly proxySecret: string;
  readonly origin: string;
  // The website's login, with this game's sign-in route as `next` (AUTH.md "Embedded games").
  readonly loginPath: string;
  // The account-changes feed (AUTH.md); null when not set up: no polling.
  readonly feed: { readonly localOrigin: string; readonly syncToken: string } | null;
}

export interface ServerConfig {
  readonly port: number;
  readonly mode: Mode;
  readonly basePath: string;
  readonly dev: boolean;
  readonly dataDir: string;
  readonly database: { readonly url: string; readonly keyHex: string } | null;
  readonly cookieSecret: string;
  readonly website: WebsiteConfig | null;
  readonly chatOrigin: string | null;
  readonly smtp: SmtpConfig | null;
  readonly publicOrigin: string;
  // Whose X-Forwarded-For names the visitor, so rate limits count visitors, not the proxy.
  readonly proxies: readonly string[];
}

// apps/server/src → the repository root.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const GAME_SLUG = 'cases';
export const PROXY_SECRET_HEADER = 'x-sc-proxy-secret';

const list = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');

function websiteFrom(env: NodeJS.ProcessEnv): WebsiteConfig {
  const proxySecret = env['SC_PROXY_SECRET'] ?? '';
  const origin = env['SC_WEBSITE_ORIGIN'] ?? '';
  const trustedProxies = list(env['SC_TRUSTED_PROXIES']);
  if (proxySecret === '' || origin === '' || trustedProxies.length === 0) {
    throw new Error('website mode needs SC_PROXY_SECRET, SC_WEBSITE_ORIGIN and SC_TRUSTED_PROXIES');
  }
  const localOrigin = env['SC_WEBSITE_LOCAL_ORIGIN'] ?? '';
  const syncToken = env['SC_GAMES_SYNC_TOKEN'] ?? '';
  return {
    trustedProxies,
    proxySecret,
    origin: new URL(origin).origin,
    loginPath: '/login?next=',
    feed: localOrigin === '' || syncToken === '' ? null : { localOrigin, syncToken },
  };
}

// A database URL without its data key refuses to start: secrets would have nothing to seal them.
function databaseFrom(env: NodeJS.ProcessEnv): ServerConfig['database'] {
  const url = env['DATABASE_URL'] ?? '';
  if (url === '') return null;
  const keyHex = env['SC_DATA_KEY'] ?? '';
  if (keyHex === '') throw new Error('DATABASE_URL needs SC_DATA_KEY');
  return { url, keyHex };
}

function chatOriginFrom(env: NodeJS.ProcessEnv): string | null {
  const origin = env['SC_CHAT_ORIGIN'] ?? '';
  return origin === '' ? null : new URL(origin).origin;
}

function smtpFrom(env: NodeJS.ProcessEnv): SmtpConfig | null {
  const host = env['SC_SMTP_HOST'] ?? '';
  if (host === '') return null;
  return {
    host,
    port: Number(env['SC_SMTP_PORT'] ?? 25),
    from: env['SC_MAIL_FROM'] ?? 'Seasonal Cases <cases@localhost>',
  };
}

// The address the reset mail links to. Outside development a server that sends mail must name
// it: a default would send every link to the user's own machine (security pass, finding 9).
function publicOriginFrom(env: NodeJS.ProcessEnv, dev: boolean, mails: boolean): string {
  const origin = env['SC_PUBLIC_ORIGIN'] ?? '';
  if (origin !== '') return new URL(origin).origin;
  if (mails && !dev) throw new Error('a server that sends mail needs SC_PUBLIC_ORIGIN');
  return 'http://localhost:5470';
}

// Website mode: the website's proxies. Local mode: SC_TRUSTED_PROXIES, else this machine (the
// reverse proxy of a standalone server, or Vite in development).
function proxiesFrom(env: NodeJS.ProcessEnv, website: WebsiteConfig | null): readonly string[] {
  if (website !== null) return website.trustedProxies;
  const listed = list(env['SC_TRUSTED_PROXIES']);
  return listed.length > 0 ? listed : ['127.0.0.1', '::1'];
}

export function configFrom(env: NodeJS.ProcessEnv): ServerConfig {
  const mode: Mode = env['SC_MODE'] === 'website' ? 'website' : 'local';
  const dev = mode === 'local' && env['NODE_ENV'] === 'development' && env['SC_DEV'] === '1';
  const website = mode === 'website' ? websiteFrom(env) : null;
  const smtp = mode === 'local' ? smtpFrom(env) : null;
  return {
    port: Number(env['SC_PORT'] ?? 3970),
    mode,
    basePath: mode === 'website' ? `/games/${GAME_SLUG}/` : '/',
    dev,
    dataDir: env['SC_DATA_DIR'] ?? `${ROOT}.local/data`,
    database: databaseFrom(env),
    cookieSecret: env['SC_COOKIE_SECRET'] ?? randomBytes(32).toString('hex'),
    website,
    chatOrigin: mode === 'local' ? chatOriginFrom(env) : null,
    smtp,
    publicOrigin: publicOriginFrom(env, dev, smtp !== null),
    proxies: proxiesFrom(env, website),
  };
}
