/**
 * @file   apps/server/src/tools/adminCommands.ts
 * @brief  What `pnpm sc admin …` does, on the store ports: promote, and reset two-factor sign-in.
 *
 * Responsibility:
 *   - `promote`: the standalone account with that name (the look-alike key, ../auth/names.ts)
 *     becomes an admin; its sessions end, so the next sign-in carries the role.
 *   - `resetTwoFactor`: the account's second factor and every recovery code are removed and its
 *     sessions end (security pass, "2FA recovery"; SC-N3 piece 1). An admin then enrols again
 *     before the admin area opens (../accountRoutes.ts).
 *   Website accounts take both from the website and are not found here. Each answers one line.
 * Depends on:     ../auth/*
 */
import type { Account, AccountStore } from '../auth/accounts.js';
import type { CredentialStore } from '../auth/credentials.js';
import { nameKey } from '../auth/names.js';
import type { SessionStore } from '../auth/sessions.js';
import type { TwoFactorStore } from '../auth/twoFactor.js';

export interface AdminStores {
  readonly accounts: AccountStore;
  readonly credentials: CredentialStore;
  readonly sessions: SessionStore;
  readonly twoFactor: TwoFactorStore;
}

async function localAccount(stores: AdminStores, name: string): Promise<Account | undefined> {
  const found = await stores.credentials.byName(nameKey(name));
  const account = found === undefined ? undefined : await stores.accounts.byId(found.accountId);
  return account === undefined || account.deleted ? undefined : account;
}

export async function promote(stores: AdminStores, name: string): Promise<string> {
  const account = await localAccount(stores, name);
  if (account === undefined) return `there is no account named ${name}`;
  await stores.accounts.save({ ...account, role: 'admin' });
  await stores.sessions.removeForAccount(account.id);
  return `${account.name} is an admin now; they sign in again`;
}

export async function resetTwoFactor(stores: AdminStores, name: string): Promise<string> {
  const account = await localAccount(stores, name);
  if (account === undefined) return `there is no account named ${name}`;
  await stores.twoFactor.remove(account.id);
  await stores.sessions.removeForAccount(account.id);
  return `${account.name} has no second factor now; they sign in and set it up again`;
}
