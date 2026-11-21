/**
 * @file   apps/server/src/config.ts
 * @brief  The server's settings from the environment, for local and website mode, development
 *         and production: every variable is read here and nowhere else (docs/CONFIG.md).
 *
 * Responsibility: read and check every variable through ./configRead.ts and refuse to start with
 *                 one message naming every missing or malformed value and the mode that needs it.
 *                 - Always: SC_PORT, SC_HOST, SC_MODE (`local` or `website`, GAME-INTEGRATION §1, base
 *                   path `/` or `/games/cases/`), SC_LOG_LEVEL, SC_DATA_DIR, SC_CLIENT_DIR.
 *                 - Development features only with NODE_ENV=development and SC_DEV=1, local mode.
 *                 - Production (NODE_ENV=production): DATABASE_URL, SC_DATA_KEY and
 *                   SC_COOKIE_SECRET (32 characters at least) are required; the built client is
 *                   served from apps/web/dist unless SC_CLIENT_DIR names another folder.
 *                 - DATABASE_URL needs SC_DATA_KEY (secrets at rest).
 *                 - Website mode: SC_PROXY_SECRET, SC_WEBSITE_ORIGIN, SC_TRUSTED_PROXIES; the
 *                   feed's SC_WEBSITE_LOCAL_ORIGIN and SC_GAMES_SYNC_TOKEN both or neither.
 *                 - Local mode: SC_CHAT_ORIGIN (development), the SMTP relay (SC_SMTP_HOST,
 *                   SC_SMTP_PORT, SC_MAIL_FROM), SC_PUBLIC_ORIGIN (required in production and by
 *                   a server that mails outside development), SC_TRUSTED_PROXIES (default this
 *                   machine).
 * Depends on:     node:crypto, node:fs, node:url, ./configRead.js, ./mail.js (types)
 */
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { EnvReader } from './configRead.js';
import type { SmtpConfig } from './mail.js';

export type Mode = 'local' | 'website';
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

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
  // The address it listens on: 127.0.0.1, or the Docker bridge for a website proxy in a container.
  readonly host: string;
  readonly mode: Mode;
  readonly basePath: string;
  readonly dev: boolean;
  readonly production: boolean;
  readonly version: string;
  readonly logLevel: LogLevel;
  readonly dataDir: string;
  readonly database: { readonly url: string; readonly keyHex: string } | null;
  readonly cookieSecret: string;
  readonly website: WebsiteConfig | null;
  readonly chatOrigin: string | null;
  readonly smtp: SmtpConfig | null;
  readonly publicOrigin: string;
  // Whose X-Forwarded-For names the visitor, so rate limits count visitors, not the proxy.
  readonly proxies: readonly string[];
  // The built client this process serves under the base path; null: Vite serves it.
  readonly clientDir: string | null;
}

// apps/server/src → the repository root.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const GAME_SLUG = 'cases';
export const PROXY_SECRET_HEADER = 'x-sc-proxy-secret';
const DEV_CLIENT = 'http://localhost:5470';
const COOKIE_SECRET_MIN = 32;

const version = (): string =>
  (JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8')) as { version: string }).version;

function websiteFrom(read: EnvReader): WebsiteConfig {
  const need = 'website mode';
  const proxySecret = read.text('SC_PROXY_SECRET', need);
  const origin = read.origin('SC_WEBSITE_ORIGIN', need);
  const trustedProxies = read.list('SC_TRUSTED_PROXIES', need);
  const localOrigin = read.origin('SC_WEBSITE_LOCAL_ORIGIN');
  const syncToken = read.text('SC_GAMES_SYNC_TOKEN');
  if ((localOrigin === '') !== (syncToken === '')) {
    read.note('SC_WEBSITE_LOCAL_ORIGIN and SC_GAMES_SYNC_TOKEN go together: set both or neither');
  }
  return {
    trustedProxies,
    proxySecret,
    origin,
    loginPath: '/login?next=',
    feed: localOrigin === '' || syncToken === '' ? null : { localOrigin, syncToken },
  };
}

// A database URL without its data key refuses to start: secrets would have nothing to seal them.
function databaseFrom(read: EnvReader, production: boolean): ServerConfig['database'] {
  const url = read.postgres('DATABASE_URL', production ? 'production' : undefined);
  const needKey = production ? 'production' : url === '' ? undefined : 'a run with DATABASE_URL';
  const keyHex = read.hexKey('SC_DATA_KEY', needKey);
  return url === '' || keyHex === '' ? null : { url, keyHex };
}

function cookieSecretFrom(read: EnvReader, production: boolean): string {
  const secret = read.text('SC_COOKIE_SECRET', production ? 'production' : undefined);
  if (secret !== '' && secret.length < COOKIE_SECRET_MIN) {
    read.note(`SC_COOKIE_SECRET must have ${String(COOKIE_SECRET_MIN)} characters at least`);
  }
  // Development and tests without one: a new random secret per start.
  return secret === '' ? randomBytes(32).toString('hex') : secret;
}

function smtpFrom(read: EnvReader): SmtpConfig | null {
  const host = read.text('SC_SMTP_HOST');
  const port = read.int('SC_SMTP_PORT', 25, { min: 1, max: 65_535 });
  const from = read.text('SC_MAIL_FROM') || 'Seasonal Cases <cases@localhost>';
  return host === '' ? null : { host, port, from };
}

// The address the reset mail links to (security pass, finding 9), and the cookie's Secure flag.
function publicOriginFrom(read: EnvReader, required: string | undefined): string {
  return read.origin('SC_PUBLIC_ORIGIN', required) || DEV_CLIENT;
}

interface Local {
  readonly chatOrigin: string | null;
  readonly smtp: SmtpConfig | null;
  readonly publicOrigin: string;
  readonly proxies: readonly string[];
}

function localFrom(read: EnvReader, dev: boolean, production: boolean): Local {
  const smtp = smtpFrom(read);
  const required = production
    ? 'production'
    : smtp !== null && !dev
      ? 'a server that sends mail'
      : undefined;
  const proxies = read.list('SC_TRUSTED_PROXIES');
  return {
    chatOrigin: read.origin('SC_CHAT_ORIGIN') || null,
    smtp,
    publicOrigin: publicOriginFrom(read, required),
    proxies: proxies.length > 0 ? proxies : ['127.0.0.1', '::1'],
  };
}

// An IPv4 address of this machine; never a name, so the bind is what the operator wrote.
function hostFrom(read: EnvReader): string {
  const host = read.text('SC_HOST');
  if (host === '') return '127.0.0.1';
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return host;
  read.note('SC_HOST must be an IPv4 address of this machine, such as 127.0.0.1');
  return '127.0.0.1';
}

interface Basics {
  readonly mode: Mode;
  readonly production: boolean;
  readonly dev: boolean;
}

function basicsFrom(read: EnvReader): Basics {
  const mode = read.choice<Mode>('SC_MODE', ['local', 'website'], 'local');
  const nodeEnv = read.text('NODE_ENV');
  const dev = mode === 'local' && nodeEnv === 'development' && read.text('SC_DEV') === '1';
  return { mode, production: nodeEnv === 'production', dev };
}

// Where the process keeps and serves things, and how much it says.
function runtimeFrom(read: EnvReader, { production, dev }: Basics) {
  const clientDir = read.text('SC_CLIENT_DIR') || (production ? `${ROOT}apps/web/dist` : '');
  return {
    // Production and development say what happens; tests and other runs only what fails.
    logLevel: read.choice('SC_LOG_LEVEL', LOG_LEVELS, production || dev ? 'info' : 'error'),
    dataDir: read.text('SC_DATA_DIR') || `${ROOT}.local/data`,
    clientDir: clientDir === '' ? null : clientDir,
  };
}

// The addresses of the mode: the website's in website mode, the local settings otherwise.
function addressesFrom(read: EnvReader, basics: Basics) {
  if (basics.mode === 'website') {
    const website = websiteFrom(read);
    const none = { chatOrigin: null, smtp: null };
    return { website, ...none, publicOrigin: website.origin, proxies: website.trustedProxies };
  }
  return { website: null, ...localFrom(read, basics.dev, basics.production) };
}

export function configFrom(env: NodeJS.ProcessEnv): ServerConfig {
  const read = new EnvReader(env);
  const basics = basicsFrom(read);
  const config: ServerConfig = {
    ...basics,
    port: read.int('SC_PORT', 3970, { min: 0, max: 65_535 }),
    host: hostFrom(read),
    basePath: basics.mode === 'website' ? `/games/${GAME_SLUG}/` : '/',
    version: version(),
    ...runtimeFrom(read, basics),
    database: databaseFrom(read, basics.production),
    cookieSecret: cookieSecretFrom(read, basics.production),
    ...addressesFrom(read, basics),
  };
  read.finish();
  return config;
}
