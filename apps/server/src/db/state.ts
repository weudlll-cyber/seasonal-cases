/**
 * @file   apps/server/src/db/state.ts
 * @brief  The server's small state in PostgreSQL: the account feed's cursor.
 *
 * Responsibility: one row of `server_state` per key; the cursor survives a restart, so the feed
 *                 goes on where it stopped instead of reading every change again.
 * Depends on:     ../auth/accountFeed.js (types), ./pool.js
 */
import type { CursorStore } from '../auth/accountFeed.js';
import type { DbPool } from './pool.js';

const FEED_CURSOR = 'account-feed-cursor';

export function pgCursor(pool: DbPool): CursorStore {
  return {
    async read() {
      const result = await pool.query<{ value: string }>(
        'SELECT value FROM server_state WHERE key = $1',
        [FEED_CURSOR],
      );
      return result.rows[0]?.value ?? '0';
    },
    async write(cursor) {
      await pool.query(
        `INSERT INTO server_state (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [FEED_CURSOR, cursor],
      );
    },
  };
}
