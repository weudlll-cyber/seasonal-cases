/**
 * @file   apps/server/src/auth/accountFeed.ts
 * @brief  The website's account-changes feed in website mode: sessions end, deletions anonymise
 *         (GAME-INTEGRATION §4, AUTH.md "Embedded games").
 *
 * Responsibility: every 15 seconds (as Mini Games) ask
 *                 `<local origin>/api/games/cases/account-changes?since=<cursor>` with the games'
 *                 sync token, page by page until caught up. `locked` and `rights`: the account's
 *                 game sessions end and their live connections close; the next sign-in
 *                 recomputes rights. `deleted`: the same, and the account is erased
 *                 (./erasure.ts, D61): it shows as "deleted player" plus its short id from then
 *                 on, its name is out of the shows' logs, its past cases kept. `unlocked`: nothing
 *                 (Mini Games' choice). Processing is safe to repeat; the cursor moves only after
 *                 a page is processed. A failing feed is logged and the game plays on. The cursor
 *                 lives in a CursorStore: the database's server_state, or memory without one.
 *                 The feed is read with the kit's `guardedFetch`: only the configured local
 *                 origin may be plain http and private, with its time and size limits and no
 *                 redirect.
 * Depends on:     @seasonal/kit/server, ./accounts.js, ./erasure.js, ./sessions.js,
 *                 ./twoFactor.js
 */
import { guardedFetch, type SessionEnds } from '@seasonal/kit/server';

import type { AccountStore, Directory } from './accounts.js';
import { eraseAccount } from './erasure.js';
import type { SessionStore } from './sessions.js';
import type { TwoFactorStore } from './twoFactor.js';

export const FEED_EVERY_MS = 15_000;
const KINDS = new Set(['deleted', 'locked', 'unlocked', 'rights']);

export interface AccountChange {
  readonly id: number;
  readonly kind: 'deleted' | 'locked' | 'unlocked' | 'rights';
}

export interface FeedDeps {
  readonly accounts: AccountStore;
  readonly sessions: SessionStore;
  readonly twoFactor: TwoFactorStore;
  readonly directory: Directory;
  readonly ends: SessionEnds;
  readonly websiteOrigin: string;
  // Takes a deleted member's name out of every show (`ShowService.forget`).
  readonly forget: (playerId: string, name: string) => number;
}

/** One change applied; safe to apply twice. */
export async function applyChange(deps: FeedDeps, change: AccountChange): Promise<void> {
  if (change.kind === 'unlocked') return;
  const account = await deps.accounts.byWebsite(deps.websiteOrigin, String(change.id));
  if (account === undefined) return;
  if (change.kind === 'deleted' && !account.deleted) await eraseAccount(deps, account);
  const ended = await deps.sessions.removeForAccount(account.id);
  if (ended.length > 0) void deps.ends.end(ended);
}

/** The changes of one answer, checked field by field; anything else is dropped. */
export function parsePage(body: unknown): { changes: AccountChange[]; next: string } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { changes, next } = body as { changes?: unknown; next?: unknown };
  if (!Array.isArray(changes) || typeof next !== 'string') return null;
  const valid = changes.filter(
    (c): c is AccountChange =>
      typeof c === 'object' &&
      c !== null &&
      Number.isSafeInteger((c as { id?: unknown }).id) &&
      KINDS.has(String((c as { kind?: unknown }).kind)),
  );
  return { changes: valid, next };
}

export interface FeedSource {
  readonly localOrigin: string;
  readonly syncToken: string;
}

/** Asks the feed until caught up; answers the new cursor. */
export async function pollOnce(deps: FeedDeps, source: FeedSource, since: string): Promise<string> {
  const { hostname, origin } = new URL(source.localOrigin);
  const send = guardedFetch({ allowedHosts: [hostname], localOrigins: [origin] });
  let cursor = since;
  for (;;) {
    const url = `${source.localOrigin}/api/games/cases/account-changes?since=${encodeURIComponent(cursor)}`;
    const response = await send(url, { headers: { 'x-games-sync-token': source.syncToken } });
    if (!response.ok) throw new Error(`account feed answered ${String(response.status)}`);
    const page = parsePage(await response.json());
    if (page === null) throw new Error('account feed answered an unknown shape');
    for (const change of page.changes) await applyChange(deps, change);
    if (page.next === cursor || page.changes.length === 0) return page.next;
    cursor = page.next;
  }
}

/** Where the feed's cursor survives a restart: memory, or the database (../db/state.ts). */
export interface CursorStore {
  read(): Promise<string>;
  write(cursor: string): Promise<void>;
}

export function memoryCursor(): CursorStore {
  let cursor = '0';
  return {
    read: () => Promise.resolve(cursor),
    write: (next) => {
      cursor = next;
      return Promise.resolve();
    },
  };
}

/** Polls every 15 s until stopped; answers the stop. */
export function startFeed(
  deps: FeedDeps,
  source: FeedSource,
  cursor: CursorStore,
  log: (e: unknown) => void,
) {
  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    cursor
      .read()
      .then((since) => pollOnce(deps, source, since))
      .then((next) => cursor.write(next))
      .catch(log)
      .finally(() => {
        running = false;
      });
  }, FEED_EVERY_MS);
  return () => {
    clearInterval(timer);
  };
}
