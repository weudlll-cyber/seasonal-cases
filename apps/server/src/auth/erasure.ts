/**
 * @file   apps/server/src/auth/erasure.ts
 * @brief  Erases an account's personal data and leaves "deleted player" in its place
 *         (DECISIONS D61).
 *
 * Responsibility: one routine for both ways an account goes: a standalone player deleting their
 *                 own, and the website telling the feed that a member was deleted there. The
 *                 account row stays as a tombstone, with no personal data: its id, the name
 *                 "deleted player" and a short id, no badges, rank 0, role player, deleted. Every
 *                 show, chronicle entry, result page and "My matches" row then shows that name
 *                 (the directory is updated, and the shows' logs and models are rewritten by
 *                 `forget`), while the cases, the ranks, the sealed distribution and the
 *                 commitment stay as they were. Gone: the sign-in data (name, e-mail, password
 *                 hash, reset links), the two-factor secret and recovery codes, every session
 *                 (its sockets are closed) and the registration waiting for the e-mail. The
 *                 stores are separate, so the order is: what could sign in again first, then
 *                 what only shows. Safe to run twice.
 *                 `forgetDeleted` repeats the last step at start, for a crash in between.
 * Depends on:     @seasonal/kit/server (types), ./accounts.js, ./credentials.js, ./pending.js,
 *                 ./sessions.js, ./twoFactor.js
 */
import type { SessionEnds } from '@seasonal/kit/server';

import { goneName, type Account, type AccountStore, type Directory } from './accounts.js';
import type { CredentialStore } from './credentials.js';
import type { PendingStore } from './pending.js';
import type { SessionStore } from './sessions.js';
import type { TwoFactorStore } from './twoFactor.js';

export interface ErasureDeps {
  readonly accounts: AccountStore;
  readonly directory: Directory;
  readonly sessions: SessionStore;
  readonly twoFactor: TwoFactorStore;
  readonly ends: SessionEnds;
  // Takes the name out of every show (`ShowService.forget`).
  readonly forget: (playerId: string, name: string) => number;
  // Standalone accounts only: the sign-in data and the registrations waiting for the e-mail.
  readonly credentials?: CredentialStore;
  readonly pending?: PendingStore;
}

/** The account without a trace of the person: what the tombstone row holds. */
export const tombstone = (account: Account): Account => ({
  ...account,
  name: goneName(account),
  role: 'player',
  rank: 0,
  badges: [],
  steps: [],
  deleted: true,
});

/**
 * Takes the name of every deleted account out of the shows again, at start: the tombstone is saved
 * before the logs are rewritten, so a crash in between would leave a name in the log for good, and
 * a deleted account cannot ask again (security pass 6, finding 3). Answers how many shows changed.
 */
export async function forgetDeleted(
  accounts: AccountStore,
  forget: ErasureDeps['forget'],
): Promise<number> {
  let changed = 0;
  for (const account of await accounts.all()) {
    if (account.deleted) changed += forget(account.id, goneName(account));
  }
  return changed;
}

export async function eraseAccount(deps: ErasureDeps, account: Account): Promise<void> {
  const { credentials, pending } = deps;
  // First what could sign the person in again.
  const signIn = credentials === undefined ? undefined : await credentials.byAccount(account.id);
  await credentials?.removeAccount(account.id);
  if (signIn !== undefined) await pending?.dropEmail(signIn.email);
  await deps.twoFactor.remove(account.id);
  const ended = await deps.sessions.removeForAccount(account.id);
  if (ended.length > 0) void deps.ends.end(ended);
  // Then what only shows the name.
  const gone = tombstone(account);
  await deps.accounts.save(gone);
  deps.directory.update(gone);
  deps.forget(account.id, gone.name);
}
