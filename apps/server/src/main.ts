/**
 * @file   apps/server/src/main.ts
 * @brief  Starts the server on its address (127.0.0.1 unless SC_HOST says otherwise) and port (CONCEPT §11: 3970), in development and
 *         production alike (`pnpm dev`, `pnpm start`).
 *
 * Responsibility: read the settings (./config.ts refuses a wrong environment with one message
 *                 naming every problem), open the database when DATABASE_URL is set (pool,
 *                 migrations, stores) or else use the JSON-lines log and memory, build and listen,
 *                 and say so in one JSON line. On SIGTERM or SIGINT: stop taking requests, close
 *                 the sockets (the app's onClose), let pending database writes finish, end the
 *                 pool, exit; after 10 s it exits anyway. An event that cannot be written stops
 *                 the server at once (systemd restarts it from the database).
 * Depends on:     ./app.js, ./config.js, ./configRead.js, ./db/open.js
 */
import { buildServer } from './app.js';
import { configFrom, type ServerConfig } from './config.js';
import { ConfigError } from './configRead.js';
import { openDatabase } from './db/open.js';

const STOP_LIMIT_MS = 10_000;

// Before the app's logger exists: the same JSON line shape on stderr.
function early(msg: string, error?: unknown): void {
  const err = error instanceof Error ? { message: error.message } : undefined;
  console.error(JSON.stringify({ level: 50, time: Date.now(), msg, ...(err ? { err } : {}) }));
}

function readConfig(): ServerConfig {
  try {
    return configFrom(process.env);
  } catch (error) {
    if (error instanceof ConfigError) early(error.message);
    else early('the settings could not be read', error);
    process.exit(1);
  }
}

const config = readConfig();
const database =
  config.database === null
    ? null
    : await openDatabase({
        ...config.database,
        // A lost event must not leave a show going on in memory that the database no longer
        // matches (a sealing written twice, two commitments): stop; systemd restarts the
        // server from the database's state (security pass 2, finding 6).
        onError: (e) => {
          early('an event could not be written; stopping', e);
          process.exit(1);
        },
      });
const { app } = await buildServer(config, database?.stores);
await app.listen({ host: config.host, port: config.port });
app.log.info(
  {
    mode: config.mode,
    version: config.version,
    dev: config.dev,
    store: database === null ? 'files and memory' : 'postgresql',
  },
  `Seasonal Cases server on http://${config.host}:${String(config.port)}${config.basePath}`,
);

let stopping = false;
const stop = (signal: string): void => {
  if (stopping) return;
  stopping = true;
  app.log.info({ signal }, 'stopping');
  setTimeout(() => process.exit(1), STOP_LIMIT_MS).unref();
  void app
    .close()
    .then(() => database?.close())
    .then(() => process.exit(0));
};
process.once('SIGINT', () => {
  stop('SIGINT');
});
process.once('SIGTERM', () => {
  stop('SIGTERM');
});
