/**
 * @file   apps/server/src/auth/sessions.ts
 * @brief  The game's own sessions: the port, an in-memory store, and the session's life.
 *
 * Responsibility: a session belongs to one account and ends after 7 days (GAME-INTEGRATION §3,
 *                 both games), when its account signs out, is locked, deleted or has its rights
 *                 changed (the account-changes feed, §4), or when a new sign-in replaces it.
 *                 The browser holds a random token; a store keeps only its sha256, so a leaked
 *                 store opens no session. `SessionEnds` (the kit) tells the socket side which
 *                 sessions ended, so their live connections close.
 * Depends on:     node:crypto
 */
import { createHash, randomBytes } from 'node:crypto';

export const SESSION_DAYS = 7;
export const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export interface Session {
  readonly id: string;
  readonly accountId: string;
  readonly expiresAt: number;
}

export interface SessionStore {
  // Saves a new session under the token's hash.
  insert(tokenHash: string, session: Session): Promise<void>;
  byTokenHash(tokenHash: string): Promise<Session | undefined>;
  remove(sessionId: string): Promise<void>;
  // Removes every session of the account; answers their ids.
  removeForAccount(accountId: string): Promise<readonly string[]>;
  // Removes every session of the account but `keepId`; answers their ids.
  removeOthers(accountId: string, keepId: string): Promise<readonly string[]>;
}

export const tokenHash = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/** Every session in memory, for tests and for a run without a database. */
export function memorySessions(): SessionStore {
  const sessions = new Map<string, Session>();
  const removeWhere = (match: (s: Session) => boolean): string[] => {
    const ended: string[] = [];
    for (const [hash, s] of sessions) {
      if (!match(s)) continue;
      sessions.delete(hash);
      ended.push(s.id);
    }
    return ended;
  };
  return {
    insert: (hash, session) => {
      sessions.set(hash, session);
      return Promise.resolve();
    },
    byTokenHash: (hash) => Promise.resolve(sessions.get(hash)),
    remove: (sessionId) => {
      for (const [hash, s] of sessions) if (s.id === sessionId) sessions.delete(hash);
      return Promise.resolve();
    },
    removeForAccount: (accountId) => Promise.resolve(removeWhere((s) => s.accountId === accountId)),
    removeOthers: (accountId, keepId) =>
      Promise.resolve(removeWhere((s) => s.accountId === accountId && s.id !== keepId)),
  };
}

/** Opens a session: answers the browser's token and the stored session. */
export async function openSession(
  store: SessionStore,
  accountId: string,
  now: number,
): Promise<{ token: string; session: Session }> {
  const token = randomBytes(32).toString('base64url');
  const session = { id: randomBytes(12).toString('hex'), accountId, expiresAt: now + SESSION_MS };
  await store.insert(tokenHash(token), session);
  return { token, session };
}

/** The live session of a token, or null; an expired one is removed on the way. */
export async function findSession(
  store: SessionStore,
  token: string,
  now: number,
): Promise<Session | null> {
  const session = await store.byTokenHash(tokenHash(token));
  if (session === undefined) return null;
  if (session.expiresAt > now) return session;
  await store.remove(session.id);
  return null;
}
