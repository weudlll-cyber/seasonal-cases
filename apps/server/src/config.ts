/**
 * @file   apps/server/src/config.ts
 * @brief  The server's settings from the environment.
 *
 * Responsibility: the port (SC_PORT, default 3970), whether the development features exist
 *                 (only with NODE_ENV=development and SC_DEV=1, CONCEPT §10), the event-log
 *                 folder (SC_DATA_DIR, default `.local/data` at the repository root) and the
 *                 cookie secret (SC_COOKIE_SECRET, else a new random one per start).
 * Depends on:     node:crypto, node:url
 */
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export interface ServerConfig {
  readonly port: number;
  readonly dev: boolean;
  readonly dataDir: string;
  readonly cookieSecret: string;
}

// apps/server/src → the repository root.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export function configFrom(env: NodeJS.ProcessEnv): ServerConfig {
  return {
    port: Number(env['SC_PORT'] ?? 3970),
    dev: env['NODE_ENV'] === 'development' && env['SC_DEV'] === '1',
    dataDir: env['SC_DATA_DIR'] ?? `${ROOT}.local/data`,
    cookieSecret: env['SC_COOKIE_SECRET'] ?? randomBytes(32).toString('hex'),
  };
}
