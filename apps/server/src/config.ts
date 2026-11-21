/**
 * @file   apps/server/src/config.ts
 * @brief  The server's settings from the environment, for local and website mode.
 *
 * Responsibility: the port (SC_PORT, default 3970); the mode (SC_MODE `local` or `website`,
 *                 GAME-INTEGRATION §1) and its base path (`/` or `/games/cases/`); whether the
 *                 development features exist (NODE_ENV=development and SC_DEV=1, local mode
 *                 only, CONCEPT §10); the event-log folder (SC_DATA_DIR); the cookie secret
 *                 (SC_COOKIE_SECRET, else a new random one per start); in website mode the
 *                 trusted proxies (SC_TRUSTED_PROXIES, a comma list), the proxy secret
 *                 (SC_PROXY_SECRET, header `X-Sc-Proxy-Secret`), the website's origin
 *                 (SC_WEBSITE_ORIGIN) and, for the account-changes feed, its local origin and the
 *                 games' sync token (SC_WEBSITE_LOCAL_ORIGIN, SC_GAMES_SYNC_TOKEN); in local
 *                 mode an optional chat origin to frame (SC_CHAT_ORIGIN, development). Website
 *                 mode without its trust settings refuses to start.
 * Depends on:     node:crypto, node:url
 */
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

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
  readonly cookieSecret: string;
  readonly website: WebsiteConfig | null;
  readonly chatOrigin: string | null;
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

export function configFrom(env: NodeJS.ProcessEnv): ServerConfig {
  const mode: Mode = env['SC_MODE'] === 'website' ? 'website' : 'local';
  const chatOrigin = env['SC_CHAT_ORIGIN'] ?? '';
  return {
    port: Number(env['SC_PORT'] ?? 3970),
    mode,
    basePath: mode === 'website' ? `/games/${GAME_SLUG}/` : '/',
    dev: mode === 'local' && env['NODE_ENV'] === 'development' && env['SC_DEV'] === '1',
    dataDir: env['SC_DATA_DIR'] ?? `${ROOT}.local/data`,
    cookieSecret: env['SC_COOKIE_SECRET'] ?? randomBytes(32).toString('hex'),
    website: mode === 'website' ? websiteFrom(env) : null,
    chatOrigin: mode === 'local' && chatOrigin !== '' ? new URL(chatOrigin).origin : null,
  };
}
