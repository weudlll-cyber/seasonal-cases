/**
 * @file   apps/server/src/db/accountStore.ts
 * @brief  The accounts and sessions in PostgreSQL, behind the ports of ../auth.
 *
 * Responsibility: `pgAccounts` and `pgSessions` fill the AccountStore and SessionStore ports with
 *                 the tables of migration 0001 (a website member's steps: 0004); a session row holds the token's sha256, never the
 *                 token. Rows map to the ports' shapes here and nowhere else.
 * Depends on:     @seasonal/kit/server (types), ../auth/accounts.js (types), ../auth/sessions.js (types), ./pool.js
 */
import type { Step } from '@seasonal/kit/server';
import type { Account, AccountKind, AccountRole, AccountStore } from '../auth/accounts.js';
import type { SessionStore } from '../auth/sessions.js';
import type { DbPool } from './pool.js';

interface AccountRow {
  id: string;
  kind: AccountKind;
  name: string;
  role: AccountRole;
  rank: number;
  badges: string[];
  steps: Step[];
  website_origin: string | null;
  website_user_id: string | null;
  deleted: boolean;
}

const ACCOUNT_COLUMNS =
  'id, kind, name, role, rank, badges, steps, website_origin, website_user_id, deleted';

const accountOf = (row: AccountRow): Account => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  role: row.role,
  rank: row.rank,
  badges: row.badges,
  steps: row.steps,
  websiteOrigin: row.website_origin,
  websiteUserId: row.website_user_id,
  deleted: row.deleted,
});

export function pgAccounts(pool: DbPool): AccountStore {
  const one = async (where: string, values: string[]) => {
    const result = await pool.query<AccountRow>(
      `SELECT ${ACCOUNT_COLUMNS} FROM accounts WHERE ${where}`,
      values,
    );
    const row = result.rows[0];
    return row === undefined ? undefined : accountOf(row);
  };
  return {
    byId: (id) => one('id = $1', [id]),
    byWebsite: (origin, userId) =>
      one('website_origin = $1 AND website_user_id = $2', [origin, userId]),
    async save(a) {
      await pool.query(
        `INSERT INTO accounts (${ACCOUNT_COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET kind = $2, name = $3, role = $4, rank = $5, badges = $6,
           steps = $7, website_origin = $8, website_user_id = $9, deleted = $10`,
        [
          a.id,
          a.kind,
          a.name,
          a.role,
          a.rank,
          JSON.stringify(a.badges),
          JSON.stringify(a.steps ?? []),
          a.websiteOrigin,
          a.websiteUserId,
          a.deleted,
        ],
      );
    },
    async all() {
      const result = await pool.query<AccountRow>(
        `SELECT ${ACCOUNT_COLUMNS} FROM accounts ORDER BY created_at`,
      );
      return result.rows.map(accountOf);
    },
  };
}

interface SessionRow {
  id: string;
  account_id: string;
  expires_at: Date;
}

export function pgSessions(pool: DbPool): SessionStore {
  return {
    async insert(hash, s) {
      await pool.query(
        'INSERT INTO sessions (token_hash, id, account_id, expires_at) VALUES ($1, $2, $3, $4)',
        [hash, s.id, s.accountId, new Date(s.expiresAt)],
      );
    },
    async byTokenHash(hash) {
      const result = await pool.query<SessionRow>(
        'SELECT id, account_id, expires_at FROM sessions WHERE token_hash = $1',
        [hash],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;
      return { id: row.id, accountId: row.account_id, expiresAt: row.expires_at.getTime() };
    },
    async remove(sessionId) {
      await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    },
    async removeForAccount(accountId) {
      const result = await pool.query<{ id: string }>(
        'DELETE FROM sessions WHERE account_id = $1 RETURNING id',
        [accountId],
      );
      return result.rows.map((r) => r.id);
    },
    async removeOthers(accountId, keepId) {
      const result = await pool.query<{ id: string }>(
        'DELETE FROM sessions WHERE account_id = $1 AND id <> $2 RETURNING id',
        [accountId, keepId],
      );
      return result.rows.map((r) => r.id);
    },
  };
}
