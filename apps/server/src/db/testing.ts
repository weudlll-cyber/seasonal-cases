/**
 * @file   apps/server/src/db/testing.ts
 * @brief  Test support: a database of its own for each test file, removed by that file.
 *
 * Responsibility: `testDatabaseUrl` is SC_TEST_DATABASE_URL, or the development database of
 *                 ops/compose.dev.yml when unset; `freshSchema` names a new random schema
 *                 (`t_` and 12 hex digits) and `dropSchema` removes it with everything in it, so
 *                 no test leaves data behind (CLAUDE.md "Test data").
 * Depends on:     node:crypto, ./pool.js
 */
import { randomBytes } from 'node:crypto';

import { createPool } from './pool.js';

const DEV_DATABASE = 'postgres://sc:change-me-dev-only@127.0.0.1:5570/sc';

export const testDatabaseUrl = (): string => process.env['SC_TEST_DATABASE_URL'] ?? DEV_DATABASE;

export const freshSchema = (): string => `t_${randomBytes(6).toString('hex')}`;

/** Drops the schema; the name passed createPool's rule when its pool was made. */
export async function dropSchema(schema: string): Promise<void> {
  const pool = createPool(testDatabaseUrl(), schema);
  try {
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  } finally {
    await pool.end();
  }
}
