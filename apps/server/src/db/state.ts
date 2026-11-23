/**
 * @file   apps/server/src/db/state.ts
 * @brief  The server's small state in PostgreSQL: the account feed's cursor and the settings.
 *
 * Responsibility: one row of `server_state` per key. The cursor survives a restart, so the feed
 *                 goes on where it stopped instead of reading every change again; the settings
 *                 are one JSON text, checked against the catalogue when read (../settings.ts).
 * Depends on:     ../auth/accountFeed.js (types), ../settings.js (types), ./pool.js
 */
import type { CursorStore } from '../auth/accountFeed.js';
import type { SettingsStore } from '../settings.js';
import type { DbPool } from './pool.js';

const FEED_CURSOR = 'account-feed-cursor';
const SETTINGS = 'settings';

async function readKey(pool: DbPool, key: string): Promise<string | undefined> {
  const result = await pool.query<{ value: string }>(
    'SELECT value FROM server_state WHERE key = $1',
    [key],
  );
  return result.rows[0]?.value;
}

async function writeKey(pool: DbPool, key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO server_state (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [key, value],
  );
}

export function pgCursor(pool: DbPool): CursorStore {
  return {
    read: async () => (await readKey(pool, FEED_CURSOR)) ?? '0',
    write: (cursor) => writeKey(pool, FEED_CURSOR, cursor),
  };
}

export function pgSettings(pool: DbPool): SettingsStore {
  return {
    async read() {
      const text = await readKey(pool, SETTINGS);
      return text === undefined ? undefined : (JSON.parse(text) as unknown);
    },
    write: (settings) => writeKey(pool, SETTINGS, JSON.stringify(settings)),
  };
}
