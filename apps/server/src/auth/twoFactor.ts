/**
 * @file   apps/server/src/auth/twoFactor.ts
 * @brief  Two-factor sign-in for standalone admins: the port, an in-memory store, the check.
 *
 * Responsibility: a TOTP secret per account (the kit's `newSecret`, 30 s steps, 6 digits), set up
 *                 first and enabled once a code from it is confirmed; ten recovery codes in the
 *                 kit's `grouped` style (Mini Games'), kept as hashes, each used once. A TOTP step
 *                 is accepted only after the last one used, so a code never works twice. Who needs
 *                 it: a local account with the admin role (website accounts sign in through the
 *                 website and its own 2FA; development accounts are for development only).
 * Depends on:     @seasonal/kit/server, ./accounts.js (types)
 */
import { looksLikeRecoveryCode, matchingStep, recoveryHash } from '@seasonal/kit/server';

import type { Account } from './accounts.js';

export interface TwoFactor {
  readonly secret: Uint8Array;
  readonly lastStep: number | null;
  readonly enabled: boolean;
}

export interface TwoFactorStore {
  get(accountId: string): Promise<TwoFactor | undefined>;
  // A new secret, not yet enabled; replaces an earlier one that was never confirmed.
  setUp(accountId: string, secret: Uint8Array): Promise<void>;
  // Enables the secret at `step` with these recovery code hashes, once: answers false when it
  // was already enabled (two confirmations at once, security pass finding 6).
  enable(accountId: string, step: number, codeHashes: readonly Buffer[]): Promise<boolean>;
  // Moves the last step forward; answers false if `step` is not after the stored one.
  useStep(accountId: string, step: number): Promise<boolean>;
  // Marks the recovery code used; answers false if it is unknown or used.
  useRecovery(accountId: string, codeHash: Buffer): Promise<boolean>;
}

export const RECOVERY_STYLE = 'grouped';

/** Whether the account must sign in with a second factor. */
export const needsTwoFactor = (account: Account): boolean =>
  account.kind === 'local' && account.role === 'admin';

/** Checks a TOTP or recovery code of an enabled account and uses it up. */
export async function codeAccepted(
  store: TwoFactorStore,
  accountId: string,
  code: string,
  now: number,
): Promise<boolean> {
  const found = await store.get(accountId);
  if (found === undefined || !found.enabled) return false;
  const typed = code.trim();
  if (looksLikeRecoveryCode(typed)) {
    return store.useRecovery(accountId, recoveryHash(typed, RECOVERY_STYLE));
  }
  const step = matchingStep(found.secret, typed, now, found.lastStep);
  return step !== null && store.useStep(accountId, step);
}

/** Everything in memory, for tests and for a run without a database. */
export function memoryTwoFactor(): TwoFactorStore {
  const all = new Map<string, TwoFactor>();
  const codes = new Map<string, Map<string, boolean>>();
  return {
    get: (id) => Promise.resolve(all.get(id)),
    setUp: (id, secret) => {
      all.set(id, { secret, lastStep: null, enabled: false });
      return Promise.resolve();
    },
    enable: (id, step, hashes) => {
      const found = all.get(id);
      if (found === undefined || found.enabled) return Promise.resolve(false);
      all.set(id, { ...found, lastStep: step, enabled: true });
      codes.set(id, new Map(hashes.map((h) => [h.toString('hex'), false])));
      return Promise.resolve(true);
    },
    useStep: (id, step) => {
      const found = all.get(id);
      if (found === undefined || (found.lastStep !== null && step <= found.lastStep)) {
        return Promise.resolve(false);
      }
      all.set(id, { ...found, lastStep: step });
      return Promise.resolve(true);
    },
    useRecovery: (id, hash) => {
      const mine = codes.get(id);
      const key = hash.toString('hex');
      if (mine?.get(key) !== false) return Promise.resolve(false);
      mine.set(key, true);
      return Promise.resolve(true);
    },
  };
}
