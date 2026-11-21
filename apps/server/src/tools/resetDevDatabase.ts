/**
 * @file   apps/server/src/tools/resetDevDatabase.ts
 * @brief  `pnpm dev:reset-db`: empties the development database and applies the migrations again.
 *
 * Responsibility: drop the `sc` schema with every account, session and show in it, then migrate
 *                 it fresh. Runs only with dev.env's NODE_ENV=development and a database on this
 *                 machine (127.0.0.1 or localhost), so it can never empty a real server.
 * Depends on:     ../db/migrator.js, ../db/pool.js
 */
import { migrate } from '../db/migrator.js';
import { createPool, SCHEMA } from '../db/pool.js';

const url = process.env['DATABASE_URL'] ?? '';
const host = url === '' ? '' : new URL(url).hostname;
if (process.env['NODE_ENV'] !== 'development' || !['127.0.0.1', 'localhost'].includes(host)) {
  console.error('dev:reset-db runs only on the development database of this machine');
  process.exit(1);
}

const pool = createPool(url, SCHEMA);
try {
  await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  const applied = await migrate(pool, SCHEMA);
  console.log(`development database reset: ${applied.join(', ')}`);
} finally {
  await pool.end();
}
