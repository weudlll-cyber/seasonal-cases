/**
 * @file   apps/server/src/accountDataRoutes.ts
 * @brief  A standalone player's own data: download it, delete the account (DECISIONS D61).
 *
 * Responsibility:
 *   - `GET /api/me/export`: the account's own data as a JSON file: the profile (name, e-mail, role,
 *     rank) and the shows joined with their case and, once it is open, its prize. No password
 *     hash, no two-factor secret, no recovery code, no session.
 *   - `POST /api/me/delete`: the password, and a current code of the second factor for an account
 *     that has one, erase the account (./auth/erasure.ts): the personal data goes, "deleted
 *     player" stays in the shows. The last admin is refused and told why, since no one could
 *     make another admin afterwards (an admin cannot take their own role away either).
 *   Only standalone accounts: a website member's account belongs to the website, which deletes
 *   and exports it (the privacy page says so); these routes answer such an account 403. Registered
 *   in local mode only (./app.ts). Both are rate limited per account, the deletion because it
 *   checks a password.
 * Depends on:     @seasonal/kit/server, @sc/contracts, @sc/domain, ./accountRoutes.js,
 *                 ./auth/*, ./http.js, ./localRoutes.js (types), ./session.js
 */
import { RateLimiter } from '@seasonal/kit/server';
import { DeleteAccountRequestSchema, type AccountExport, type Match, type Me } from '@sc/contracts';
import { publicView } from '@sc/domain';

import { matchOf } from './accountRoutes.js';
import type { Account } from './auth/accounts.js';
import { eraseAccount } from './auth/erasure.js';
import { passwordMatches } from './auth/passwords.js';
import { codeAccepted } from './auth/twoFactor.js';
import { parseBody, Refusal, signedIn, type Ctx } from './http.js';
import type { LocalAccounts } from './localRoutes.js';
import { signOut } from './session.js';

const MINUTE = 60_000;
const TOO_MANY = 'too many tries, wait a few minutes';

/** The signed-in standalone account; a website member or a development account is refused. */
async function ownAccount(ctx: Ctx, me: Me): Promise<Account> {
  const account = await ctx.auth.accounts.byId(me.id);
  if (account === undefined || account.deleted) throw new Refusal(401, 'sign in first');
  if (account.kind === 'website') {
    throw new Refusal(403, 'Your account belongs to the website: delete or export it there.');
  }
  if (account.kind !== 'local') throw new Refusal(403, 'Only a standalone account has data here.');
  return account;
}

/** Whether another admin would be left: a deleted account no longer counts. */
async function otherAdmin(ctx: Ctx, account: Account): Promise<boolean> {
  return (await ctx.auth.accounts.all()).some(
    (a) => a.role === 'admin' && !a.deleted && a.kind !== 'dev' && a.id !== account.id,
  );
}

/** The account's own data for "Download my data": no hash, no secret, no session. */
async function exportOf(ctx: Ctx, local: LocalAccounts, me: Me): Promise<AccountExport> {
  const { auth, shows } = ctx;
  const account = await ownAccount(ctx, me);
  const credential = await local.credentials.byAccount(account.id);
  const matches = shows
    .list()
    .map((model) => matchOf(model, publicView(model, auth.directory.lookup), account.id))
    .filter((m): m is Match => m !== null);
  return {
    exportedAt: new Date(auth.now()).toISOString(),
    profile: {
      name: account.name,
      email: credential?.email ?? '',
      role: account.role,
      rank: account.rank,
    },
    matches,
  };
}

/** Checks the second factor's code when the account has one. */
async function checkSecondFactor(ctx: Ctx, account: Account, code: string | undefined) {
  const { auth } = ctx;
  if ((await auth.twoFactor.get(account.id))?.enabled !== true) return;
  if (code === undefined) throw new Refusal(401, 'Enter a current code of your second factor.');
  const store = { store: auth.twoFactor, recoveryKey: auth.recoveryKey };
  if (!(await codeAccepted(store, account.id, code, auth.now()))) {
    throw new Refusal(401, 'Wrong code.');
  }
}

/**
 * One deletion at a time: "is there another admin" and the erasure are two steps with awaits
 * between them, and two admins deleting together would each find the other still there and leave
 * the game without one (security pass 6, finding 1). One process holds every session, so a queue
 * in this process is enough.
 */
function oneAtATime(): <T>(job: () => Promise<T>) => Promise<T> {
  let turn: Promise<unknown> = Promise.resolve();
  return (job) => {
    const run = turn.then(job, job);
    turn = run.catch(() => undefined);
    return run;
  };
}

export function accountDataRoutes(ctx: Ctx, local: LocalAccounts): void {
  const { app, auth, shows } = ctx;
  const exclusive = oneAtATime();
  const downloads = new RateLimiter({ limit: 10, windowMs: 15 * MINUTE });
  const deletions = new RateLimiter({ limit: 5, windowMs: 15 * MINUTE });

  app.get('/api/me/export', async (request, reply): Promise<AccountExport> => {
    const me = await signedIn(ctx, request);
    if (!downloads.take(me.id).allowed) throw new Refusal(429, TOO_MANY);
    const data = await exportOf(ctx, local, me);
    void reply.header('content-disposition', 'attachment; filename="seasonal-cases-my-data.json"');
    // The file holds an e-mail address: no cache keeps it (security pass 6, finding 2).
    void reply.header('cache-control', 'no-store');
    return data;
  });

  app.post('/api/me/delete', async (request, reply) => {
    const me = await signedIn(ctx, request);
    const { password, code } = parseBody(DeleteAccountRequestSchema, request.body);
    if (!deletions.take(me.id).allowed) throw new Refusal(429, TOO_MANY);
    const account = await ownAccount(ctx, me);
    const credential = await local.credentials.byAccount(account.id);
    if (credential === undefined || !(await passwordMatches(credential.passwordHash, password))) {
      throw new Refusal(401, 'Wrong password.');
    }
    await checkSecondFactor(ctx, account, code);
    await exclusive(async () => {
      if (account.role === 'admin' && !(await otherAdmin(ctx, account))) {
        throw new Refusal(
          409,
          'You are the last admin: make another account an admin first (in the admin area, or with `pnpm sc admin promote <name>`), then delete this one.',
        );
      }
      await eraseAccount(
        {
          ...auth,
          forget: (playerId, name) => shows.forget(playerId, name),
          credentials: local.credentials,
          pending: local.pending,
        },
        account,
      );
    });
    await signOut(app, auth, request, reply);
    return { ok: true };
  });
}
