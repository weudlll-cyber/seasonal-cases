/**
 * @file   apps/server/src/db/pool.ts
 * @brief  The PostgreSQL pool, one per server, its schema on the search path, and transactions.
 *
 * Responsibility: create a pg.Pool for DATABASE_URL whose connections all work in one schema
 *                 (`sc`; a test file uses a schema of its own and drops it, ./testing.ts), and run
 *                 one transaction on one client. After seasonal-mini-games
 *                 apps/server/src/db/pool.ts.
 * Depends on:     pg
 */
import pg from 'pg';

const { Pool } = pg;

export type DbPool = pg.Pool;
export type DbClient = pg.PoolClient;

export const SCHEMA = 'sc';
const SAFE_SCHEMA = /^[a-z_][a-z0-9_]{0,62}$/;

export function createPool(databaseUrl: string, schema: string = SCHEMA): DbPool {
  if (!SAFE_SCHEMA.test(schema)) throw new Error(`unsafe schema name ${schema}`);
  // application_name tags connections in pg_stat_activity; search_path keeps every statement in
  // the schema without naming it.
  return new Pool({
    connectionString: databaseUrl,
    application_name: 'sc-server',
    max: 10,
    options: `-c search_path=${schema}`,
  });
}

/** One transaction on one client: committed when `work` returns, rolled back when it throws. */
export async function inTransaction<T>(
  pool: DbPool,
  work: (client: DbClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
