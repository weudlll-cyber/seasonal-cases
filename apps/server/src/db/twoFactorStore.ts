/**
 * @file   apps/server/src/db/twoFactorStore.ts
 * @brief  Two-factor secrets and recovery codes in PostgreSQL.
 *
 * Responsibility: fill the TwoFactorStore port (../auth/twoFactor.ts) with the tables
 *                 `two_factor` and `recovery_codes` of migration 0001. The TOTP secret is stored
 *                 encrypted with SC_DATA_KEY and bound to its account (./box.ts); a step moves forward and a recovery code
 *                 is marked used in the statement that checks it, so neither works twice even
 *                 under two requests at once. Re-issued recovery codes replace the old rows in
 *                 one transaction.
 * Depends on:     ../auth/twoFactor.js (types), ./box.js, ./pool.js
 */
import type { TwoFactorStore } from '../auth/twoFactor.js';
import { open, seal } from './box.js';
import { inTransaction, type DbPool } from './pool.js';

interface Row {
  secret_box: string;
  last_step: string | null;
  enabled_at: Date | null;
}

// Only the first confirmation enables; a second one at the same time finds no row.
function enableOnce(
  pool: DbPool,
  accountId: string,
  step: number,
  hashes: readonly Buffer[],
): Promise<boolean> {
  return inTransaction(pool, async (client) => {
    const updated = await client.query(
      `UPDATE two_factor SET last_step = $2, enabled_at = now()
       WHERE account_id = $1 AND enabled_at IS NULL`,
      [accountId, step],
    );
    if (updated.rowCount !== 1) return false;
    await client.query('DELETE FROM recovery_codes WHERE account_id = $1', [accountId]);
    for (const hash of hashes) {
      await client.query('INSERT INTO recovery_codes (account_id, code_hash) VALUES ($1, $2)', [
        accountId,
        hash,
      ]);
    }
    return true;
  });
}

// New recovery codes for an enabled account: the old rows go in the same transaction.
function replaceCodes(pool: DbPool, accountId: string, hashes: readonly Buffer[]) {
  return inTransaction(pool, async (client) => {
    const enabled = await client.query(
      'SELECT 1 FROM two_factor WHERE account_id = $1 AND enabled_at IS NOT NULL FOR UPDATE',
      [accountId],
    );
    if (enabled.rowCount !== 1) return false;
    await client.query('DELETE FROM recovery_codes WHERE account_id = $1', [accountId]);
    for (const hash of hashes) {
      await client.query('INSERT INTO recovery_codes (account_id, code_hash) VALUES ($1, $2)', [
        accountId,
        hash,
      ]);
    }
    return true;
  });
}

export function pgTwoFactor(pool: DbPool, key: Buffer): TwoFactorStore {
  return {
    async get(accountId) {
      const result = await pool.query<Row>(
        'SELECT secret_box, last_step, enabled_at FROM two_factor WHERE account_id = $1',
        [accountId],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;
      return {
        secret: new Uint8Array(
          Buffer.from(open(key, row.secret_box, `two_factor:${accountId}`), 'base64'),
        ),
        // bigint arrives as text; steps are far below 2^53.
        lastStep: row.last_step === null ? null : Number(row.last_step),
        enabled: row.enabled_at !== null,
      };
    },
    async setUp(accountId, secret) {
      const box = seal(key, Buffer.from(secret).toString('base64'), `two_factor:${accountId}`);
      await pool.query(
        `INSERT INTO two_factor (account_id, secret_box) VALUES ($1, $2)
         ON CONFLICT (account_id) DO UPDATE SET secret_box = $2, last_step = NULL
         WHERE two_factor.enabled_at IS NULL`,
        [accountId, box],
      );
    },
    enable: (accountId, step, hashes) => enableOnce(pool, accountId, step, hashes),
    replaceRecovery: (accountId, hashes) => replaceCodes(pool, accountId, hashes),
    async useStep(accountId, step) {
      const result = await pool.query(
        `UPDATE two_factor SET last_step = $2
         WHERE account_id = $1 AND (last_step IS NULL OR last_step < $2)`,
        [accountId, step],
      );
      return result.rowCount === 1;
    },
    async remove(accountId) {
      // The recovery codes go with the row (ON DELETE CASCADE is on the account; both explicit).
      await pool.query('DELETE FROM recovery_codes WHERE account_id = $1', [accountId]);
      await pool.query('DELETE FROM two_factor WHERE account_id = $1', [accountId]);
    },
    async useRecovery(accountId, hash) {
      const result = await pool.query(
        `UPDATE recovery_codes SET used_at = now()
         WHERE account_id = $1 AND code_hash = $2 AND used_at IS NULL`,
        [accountId, hash],
      );
      return result.rowCount === 1;
    },
  };
}
