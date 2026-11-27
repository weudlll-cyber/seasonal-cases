/**
 * @file   apps/server/src/tools/migrate.ts
 * @brief  The compose stack's migration service: runs once before the game, as the owner role.
 *
 * Responsibility: connect with DATABASE_URL (the owner's, ops/compose.yml), migrate and grant the
 *                 app role (../db/roles.ts), say what happened in one JSON line, and exit; a
 *                 failure exits 1, so the game is not started on a database it does not match.
 * Depends on:     ../db/pool.js, ../db/roles.js
 */
import { createPool, SCHEMA } from '../db/pool.js';
import { migrateAndGrant } from '../db/roles.js';

const say = (level: number, msg: string, more: object = {}): void => {
  console.log(JSON.stringify({ level, time: Date.now(), msg, ...more }));
};

const url = process.env['DATABASE_URL'] ?? '';
if (url === '') {
  say(50, 'the migration needs DATABASE_URL (the owner role)');
  process.exit(1);
}
const pool = createPool(url);
try {
  say(30, 'database migrated', await migrateAndGrant(pool, SCHEMA));
} catch (error) {
  say(50, 'the migration failed', {
    err: { message: error instanceof Error ? error.message : String(error) },
  });
  process.exitCode = 1;
} finally {
  await pool.end();
}
