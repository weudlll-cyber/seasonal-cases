/**
 * @file   apps/server/src/auth/accounts.ts
 * @brief  The game's accounts: the port every store fills, an in-memory store, and the names
 *         the screens show.
 *
 * Responsibility: an account is a player, an organiser or an admin, with a rank, website badges
 *                 and its kind: `dev` (the development sign-in), `local` (standalone accounts,
 *                 piece 6 of SC-N2) or `website` (keyed by website origin and user id, never by
 *                 name or e-mail, GAME-INTEGRATION §3). A deleted website account keeps its id
 *                 and shows as "deleted player" plus its short id everywhere (§4). `Directory`
 *                 keeps every account's shown name and badges in memory for the projections,
 *                 which must not wait on a store.
 * Depends on:     @sc/contracts (types), @sc/domain (types)
 */
import type { Me } from '@sc/contracts';
import type { Person } from '@sc/domain';

export type AccountRole = 'player' | 'organiser' | 'admin';
export type AccountKind = 'dev' | 'local' | 'website';

export interface Account {
  readonly id: string;
  readonly kind: AccountKind;
  readonly name: string;
  readonly role: AccountRole;
  readonly rank: number;
  readonly badges: readonly string[];
  readonly websiteOrigin: string | null;
  readonly websiteUserId: string | null;
  readonly deleted: boolean;
}

export interface AccountStore {
  byId(id: string): Promise<Account | undefined>;
  byWebsite(origin: string, userId: string): Promise<Account | undefined>;
  // Inserts a new account or replaces the one with the same id.
  save(account: Account): Promise<void>;
  all(): Promise<readonly Account[]>;
}

/** Every account in memory, for tests and for a run without a database. */
export function memoryAccounts(): AccountStore {
  const byId = new Map<string, Account>();
  return {
    byId: (id) => Promise.resolve(byId.get(id)),
    byWebsite: (origin, userId) =>
      Promise.resolve(
        [...byId.values()].find((a) => a.websiteOrigin === origin && a.websiteUserId === userId),
      ),
    save: (account) => {
      byId.set(account.id, account);
      return Promise.resolve();
    },
    all: () => Promise.resolve([...byId.values()]),
  };
}

/** What a deleted account is shown as: "deleted player" and its short id (DECISIONS D61). */
export const goneName = (account: Pick<Account, 'id'>): string =>
  `deleted player ${account.id.slice(0, 6)}`;

/** The name an account is shown with: "deleted player" and its short id once deleted. */
export function shownName(account: Account): string {
  return account.deleted ? goneName(account) : account.name;
}

/** The signed-in user as the client knows them. */
export function meOf(account: Account): Me {
  return {
    id: account.id,
    name: shownName(account),
    role: account.role,
    rank: account.rank,
    badges: [...account.badges],
  };
}

/** The shown names and badges of every account, kept up to date by whoever saves one. */
export class Directory {
  private readonly people = new Map<string, Person>();

  static async load(store: AccountStore): Promise<Directory> {
    const directory = new Directory();
    for (const account of await store.all()) directory.update(account);
    return directory;
  }

  update(account: Account): void {
    this.people.set(account.id, { name: shownName(account), badges: account.badges });
  }

  readonly lookup = (id: string): Person | undefined => this.people.get(id);
}
