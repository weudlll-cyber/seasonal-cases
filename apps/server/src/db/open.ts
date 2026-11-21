/**
 * @file   apps/server/src/db/open.ts
 * @brief  Opens the database for a server: pool, migrations, and every store over it.
 *
 * Responsibility: one call that ./main.ts (and the store tests) make: create the pool in its
 *                 schema, apply the pending migrations, load the event log, and answer the stores
 *                 for buildServer plus a close that waits for pending writes first.
 * Depends on:     ../app.js (types), ./accountStore.js, ./box.js, ./credentialStore.js,
 *                 ./eventStore.js, ./migrator.js, ./pool.js, ./state.js, ./twoFactorStore.js
 */
import type { Stores } from '../app.js';
import { pgAccounts, pgSessions } from './accountStore.js';
import { pgCredentials } from './credentialStore.js';
import { dataKey } from './box.js';
import { pgEventStore, type PgEventStore } from './eventStore.js';
import { migrate } from './migrator.js';
import { createPool, SCHEMA, type DbPool } from './pool.js';
import { pgCursor, pgSettings } from './state.js';
import { pgTwoFactor } from './twoFactorStore.js';

export interface Database {
  readonly pool: DbPool;
  readonly stores: Required<Omit<Stores, 'mailer'>> & { readonly events: PgEventStore };
  /** Waits for pending event writes, then ends the pool. */
  close(): Promise<void>;
}

export interface DatabaseOptions {
  readonly url: string;
  /** SC_DATA_KEY: 64 hex digits. */
  readonly keyHex: string;
  readonly schema?: string;
  readonly onError: (error: unknown) => void;
}

export async function openDatabase(options: DatabaseOptions): Promise<Database> {
  const key = dataKey(options.keyHex);
  const schema = options.schema ?? SCHEMA;
  const pool = createPool(options.url, schema);
  await migrate(pool, schema);
  const events = await pgEventStore(pool, key, options.onError);
  return {
    pool,
    stores: {
      events,
      accounts: pgAccounts(pool),
      sessions: pgSessions(pool),
      cursor: pgCursor(pool),
      settings: pgSettings(pool),
      credentials: pgCredentials(pool),
      twoFactor: pgTwoFactor(pool, key),
    },
    async close() {
      await events.flush();
      await pool.end();
    },
  };
}
