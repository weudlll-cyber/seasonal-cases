/**
 * @file   apps/server/src/db/pendingStore.ts
 * @brief  Registrations waiting for their confirmation link, in PostgreSQL.
 *
 * Responsibility: fill the PendingStore port (../auth/pending.ts) with the table of migration
 *                 0003. A registration replaces the earlier one of its e-mail in one statement;
 *                 taking a token deletes its row in the same statement that reads it, so two
 *                 uses of one link make one account.
 * Depends on:     ../auth/pending.js (types), ./pool.js
 */
import type { Pending, PendingStore } from '../auth/pending.js';
import type { DbPool } from './pool.js';

interface Row {
  email: string;
  token_hash: string;
  name: string;
  password_hash: string;
  expires_at: Date;
  mailed_at: Date;
}

const COLUMNS = 'email, token_hash, name, password_hash, expires_at, mailed_at';

const pendingOf = (row: Row): Pending => ({
  email: row.email,
  tokenHash: row.token_hash,
  name: row.name,
  passwordHash: row.password_hash,
  expiresAt: row.expires_at.getTime(),
  mailedAt: row.mailed_at.getTime(),
});

export function pgPending(pool: DbPool): PendingStore {
  return {
    async byEmail(email, now) {
      const result = await pool.query<Row>(
        `SELECT ${COLUMNS} FROM pending_registrations WHERE email = $1 AND expires_at > $2`,
        [email, new Date(now)],
      );
      const row = result.rows[0];
      return row === undefined ? undefined : pendingOf(row);
    },
    async put(p) {
      await pool.query(
        `INSERT INTO pending_registrations (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET token_hash = EXCLUDED.token_hash,
           name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
           expires_at = EXCLUDED.expires_at, mailed_at = EXCLUDED.mailed_at`,
        [p.email, p.tokenHash, p.name, p.passwordHash, new Date(p.expiresAt), new Date(p.mailedAt)],
      );
    },
    async take(hash, now) {
      const result = await pool.query<Row>(
        `DELETE FROM pending_registrations WHERE token_hash = $1 RETURNING ${COLUMNS}`,
        [hash],
      );
      const row = result.rows[0];
      return row === undefined || row.expires_at.getTime() <= now ? undefined : pendingOf(row);
    },
    async purge(now) {
      await pool.query('DELETE FROM pending_registrations WHERE expires_at <= $1', [new Date(now)]);
    },
    async dropEmail(email) {
      await pool.query('DELETE FROM pending_registrations WHERE email = $1', [email]);
    },
  };
}
