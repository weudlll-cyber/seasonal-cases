/**
 * @file   apps/server/src/db/migrator.ts
 * @brief  The SQL migration runner: the files of ./migrations in order, each once.
 *
 * Responsibility: create the schema and its `schema_migrations` table where they are missing,
 *                 apply every pending migration in one transaction each, record its name and
 *                 sha256, and refuse a migration whose file changed after it was applied (a
 *                 published migration is immutable). A database that is current gets no schema
 *                 statement at all, so a server connected as the app role, which may only read
 *                 and write rows, starts on it (./roles.ts). After seasonal-mini-games
 *                 apps/server/src/db/migrator.ts, per schema instead of a fixed one.
 * Depends on:     node:crypto, node:fs, node:path, node:url, ./pool.js
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { inTransaction, type DbPool } from './pool.js';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

interface MigrationFile {
  readonly id: string;
  readonly checksum: string;
  readonly sql: string;
}

function migrationFiles(): MigrationFile[] {
  return readdirSync(DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((id) => {
      const sql = readFileSync(path.join(DIR, id), 'utf8');
      return { id, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    });
}

/** The recorded checksums by migration, or null while the schema has no record yet. */
async function record(pool: DbPool, schema: string): Promise<Map<string, string> | null> {
  const found = await pool.query<{ name: string | null }>('SELECT to_regclass($1)::text AS name', [
    `${schema}.schema_migrations`,
  ]);
  if ((found.rows[0]?.name ?? null) === null) return null;
  const rows = await pool.query<{ id: string; checksum: string }>(
    'SELECT id, checksum FROM schema_migrations',
  );
  return new Map(rows.rows.map((r) => [r.id, r.checksum]));
}

async function createRecord(pool: DbPool, schema: string): Promise<void> {
  // The schema name is checked by createPool's rule before any pool exists for it.
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
}

/** Applies what is pending in `schema`; answers the names applied now. */
export async function migrate(pool: DbPool, schema: string): Promise<string[]> {
  let applied = await record(pool, schema);
  if (applied === null) {
    await createRecord(pool, schema);
    applied = new Map();
  }
  const done: string[] = [];
  for (const file of migrationFiles()) {
    const recorded = applied.get(file.id);
    if (recorded === file.checksum) continue;
    if (recorded !== undefined)
      throw new Error(`migration ${file.id} changed after it was applied`);
    await inTransaction(pool, async (client) => {
      await client.query(file.sql);
      await client.query('INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)', [
        file.id,
        file.checksum,
      ]);
    });
    done.push(file.id);
  }
  return done;
}
