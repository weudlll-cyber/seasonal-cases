/**
 * @file   apps/server/src/auth/pending.ts
 * @brief  Registrations waiting for their confirmation link: the port and an in-memory store.
 *
 * Responsibility: DECISIONS D42. A registration is no account: it holds the name as typed, the
 *                 e-mail (its key, ./credentials.ts), the password's Argon2id hash, its link's
 *                 token as a sha256, when it expires (24 h) and when its mail went out. One per
 *                 e-mail: a new one for the same e-mail replaces it, and the old link stops
 *                 working. Taking a token removes the registration, so a link works once; an
 *                 expired one is never answered and is purged. Names are not reserved here: the
 *                 first link used makes the account (../registerRoute.ts). PostgreSQL fills the
 *                 port in ../db/pendingStore.ts.
 * Depends on:     nothing
 */
export const PENDING_MS = 24 * 60 * 60_000;
// A second registration for the same e-mail sends its mail again no sooner than this.
export const RESEND_MS = 60_000;

export interface Pending {
  readonly tokenHash: string;
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly expiresAt: number;
  readonly mailedAt: number;
}

export interface PendingStore {
  // The registration of this e-mail, unless it expired by `now`.
  byEmail(email: string, now: number): Promise<Pending | undefined>;
  // Stores the registration in place of any earlier one of its e-mail.
  put(pending: Pending): Promise<void>;
  // Removes the registration of this token and answers it, unless it expired by `now`.
  take(tokenHash: string, now: number): Promise<Pending | undefined>;
  // Removes every registration expired by `now`.
  purge(now: number): Promise<void>;
  // Removes the registration waiting for this e-mail, whatever its age (D61).
  dropEmail(email: string): Promise<void>;
}

/** Everything in memory, for tests and for a run without a database. */
export function memoryPending(): PendingStore {
  const all = new Map<string, Pending>();
  const live = (p: Pending | undefined, now: number) =>
    p !== undefined && p.expiresAt > now ? p : undefined;
  return {
    byEmail: (email, now) => Promise.resolve(live(all.get(email), now)),
    put: (pending) => {
      all.set(pending.email, pending);
      return Promise.resolve();
    },
    take: (hash, now) => {
      const found = [...all.values()].find((p) => p.tokenHash === hash);
      if (found !== undefined) all.delete(found.email);
      return Promise.resolve(live(found, now));
    },
    purge: (now) => {
      for (const [email, p] of all) if (p.expiresAt <= now) all.delete(email);
      return Promise.resolve();
    },
    dropEmail: (email) => {
      all.delete(email);
      return Promise.resolve();
    },
  };
}
