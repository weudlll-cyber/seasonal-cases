/**
 * @file   apps/server/src/db/credentialStore.ts
 * @brief  Standalone accounts' sign-in data and reset tokens in PostgreSQL.
 *
 * Responsibility: fill the CredentialStore port (../auth/credentials.ts) with the tables of
 *                 migration 0002. A clash on the name or the e-mail answers false, never throws;
 *                 taking a reset token marks it used in the same statement, so it works once.
 * Depends on:     ../auth/credentials.js (types), ./pool.js
 */
import type { Credential, CredentialStore } from '../auth/credentials.js';
import type { DbPool } from './pool.js';

interface Row {
  account_id: string;
  name_key: string;
  email: string;
  password_hash: string;
}

const credentialOf = (row: Row): Credential => ({
  accountId: row.account_id,
  nameKey: row.name_key,
  email: row.email,
  passwordHash: row.password_hash,
});

export function pgCredentials(pool: DbPool): CredentialStore {
  const one = async (column: 'account_id' | 'name_key' | 'email', value: string) => {
    const result = await pool.query<Row>(
      `SELECT account_id, name_key, email, password_hash FROM local_credentials
       WHERE ${column} = $1`,
      [value],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : credentialOf(row);
  };
  return {
    byName: (key) => one('name_key', key),
    byEmail: (email) => one('email', email),
    byAccount: (accountId) => one('account_id', accountId),
    async create(c) {
      const result = await pool.query(
        `INSERT INTO local_credentials (account_id, name_key, email, password_hash)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [c.accountId, c.nameKey, c.email, c.passwordHash],
      );
      return result.rowCount === 1;
    },
    async setPassword(accountId, passwordHash) {
      await pool.query('UPDATE local_credentials SET password_hash = $2 WHERE account_id = $1', [
        accountId,
        passwordHash,
      ]);
    },
    async addReset(hash, accountId, expiresAt) {
      await pool.query(
        'INSERT INTO password_resets (token_hash, account_id, expires_at) VALUES ($1, $2, $3)',
        [hash, accountId, new Date(expiresAt)],
      );
    },
    async takeReset(hash, now) {
      const result = await pool.query<{ account_id: string }>(
        `UPDATE password_resets SET used_at = $2
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2 RETURNING account_id`,
        [hash, new Date(now)],
      );
      return result.rows[0]?.account_id;
    },
    async endResets(accountId) {
      await pool.query(
        'UPDATE password_resets SET used_at = now() WHERE account_id = $1 AND used_at IS NULL',
        [accountId],
      );
    },
  };
}
