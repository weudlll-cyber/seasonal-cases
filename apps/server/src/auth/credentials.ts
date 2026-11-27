/**
 * @file   apps/server/src/auth/credentials.ts
 * @brief  The sign-in data of standalone accounts: the port, an in-memory store, the keys.
 *
 * Responsibility: a local account's name key (./names.ts, unique), its e-mail (lower case,
 *                 unique) and its password hash; the password-reset tokens by their sha256, used
 *                 once and only before they expire. The account itself lives in ./accounts.ts.
 *                 PostgreSQL fills the port in ../db/credentialStore.ts.
 * Depends on:     nothing
 */
export interface Credential {
  readonly accountId: string;
  readonly nameKey: string;
  readonly email: string;
  readonly passwordHash: string;
}

export interface CredentialStore {
  byName(nameKey: string): Promise<Credential | undefined>;
  byEmail(email: string): Promise<Credential | undefined>;
  byAccount(accountId: string): Promise<Credential | undefined>;
  // Answers false when the name or the e-mail is taken.
  create(credential: Credential): Promise<boolean>;
  setPassword(accountId: string, passwordHash: string): Promise<void>;
  addReset(tokenHash: string, accountId: string, expiresAt: number): Promise<void>;
  // Marks the token used and answers its account, if it is unused and not expired at `now`.
  takeReset(tokenHash: string, now: number): Promise<string | undefined>;
  // Marks every unused reset of the account used: after a reset no older link works.
  endResets(accountId: string): Promise<void>;
  // Removes the account's sign-in data and every reset token: the name, the e-mail and the
  // password hash (a player deleting their account, DECISIONS D61).
  removeAccount(accountId: string): Promise<void>;
}

export const emailKey = (email: string): string => email.trim().toLowerCase();

interface Reset {
  readonly accountId: string;
  readonly expiresAt: number;
  used: boolean;
}

/** Everything in memory, for tests and for a run without a database. */
export function memoryCredentials(): CredentialStore {
  const all = new Map<string, Credential>();
  const resets = new Map<string, Reset>();
  const find = (match: (c: Credential) => boolean) =>
    Promise.resolve([...all.values()].find(match));
  return {
    byName: (key) => find((c) => c.nameKey === key),
    byEmail: (email) => find((c) => c.email === email),
    byAccount: (accountId) => Promise.resolve(all.get(accountId)),
    create: (c) => {
      const taken = [...all.values()].some((o) => o.nameKey === c.nameKey || o.email === c.email);
      if (!taken) all.set(c.accountId, c);
      return Promise.resolve(!taken);
    },
    setPassword: (accountId, passwordHash) => {
      const c = all.get(accountId);
      if (c !== undefined) all.set(accountId, { ...c, passwordHash });
      return Promise.resolve();
    },
    addReset: (hash, accountId, expiresAt) => {
      resets.set(hash, { accountId, expiresAt, used: false });
      return Promise.resolve();
    },
    takeReset: (hash, now) => {
      const reset = resets.get(hash);
      if (reset === undefined || reset.used || reset.expiresAt <= now) {
        return Promise.resolve(undefined);
      }
      reset.used = true;
      return Promise.resolve(reset.accountId);
    },
    endResets: (accountId) => {
      for (const reset of resets.values()) if (reset.accountId === accountId) reset.used = true;
      return Promise.resolve();
    },
    removeAccount: (accountId) => {
      all.delete(accountId);
      for (const [hash, reset] of resets) if (reset.accountId === accountId) resets.delete(hash);
      return Promise.resolve();
    },
  };
}
