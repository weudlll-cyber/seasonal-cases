/**
 * @file   apps/server/src/main.ts
 * @brief  Starts the server on 127.0.0.1 at its port (CONCEPT §11: 3970).
 *
 * Responsibility: read the settings from the environment, open the database when DATABASE_URL
 *                 is set (else the JSON-lines log and memory), rebuild the shows from the event
 *                 log, listen, and say where, in which mode and on which store. On SIGINT or
 *                 SIGTERM the server closes and pending database writes finish first.
 * Depends on:     ./app.js, ./config.js, ./db/open.js
 */
import { buildServer } from './app.js';
import { configFrom } from './config.js';
import { openDatabase } from './db/open.js';

const config = configFrom(process.env);
const logError = (error: unknown): void => {
  console.error(error);
};
const database =
  config.database === null ? null : await openDatabase({ ...config.database, onError: logError });
const { app } = await buildServer(config, database?.stores);
await app.listen({ host: '127.0.0.1', port: config.port });

const stop = (): void => {
  void app
    .close()
    .then(() => database?.close())
    .then(() => process.exit(0));
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

const mode = config.dev ? 'development (dev sign-in on)' : 'no development features';
const store = database === null ? 'files and memory' : 'PostgreSQL';
console.log(`Seasonal Cases server on http://127.0.0.1:${String(config.port)}, ${mode}, ${store}`);
