/**
 * @file   apps/server/src/accountRoutes.ts
 * @brief  The admin's accounts (roles and ranks) and a player's matches.
 *
 * Responsibility:
 *   - `GET /api/admin/accounts` and `POST /api/admin/accounts/:id`: an admin lists the accounts
 *     and sets a role or a rank (CONCEPT §4, ranks assigned by admins, DECISIONS D24). A website
 *     account takes both from the website and is refused; an admin cannot take their own admin
 *     role, so there is always one. A role change ends the account's sessions; the next sign-in
 *     carries the new role.
 *   - `GET /api/me/matches` ("My matches", CONCEPT §3.5): the signed-in user's case in every
 *     show, from the public view only, so a prize shows once its case is open and never before.
 * Depends on:     @sc/contracts, @sc/domain, ./auth/accounts.js, ./http.js
 */
import {
  AccountUpdateSchema,
  prizeTitle,
  type AccountRow,
  type Match,
  type Me,
  type PublicShowView,
} from '@sc/contracts';
import { publicView, type ShowModel } from '@sc/domain';
import type { FastifyRequest } from 'fastify';

import { shownName, type Account } from './auth/accounts.js';
import { parseBody, Refusal, signedIn, type Ctx } from './http.js';

const rowOf = (a: Account): AccountRow => ({
  id: a.id,
  name: shownName(a),
  kind: a.kind,
  role: a.role,
  rank: a.rank,
});

async function admin(ctx: Ctx, request: FastifyRequest): Promise<Me> {
  const me = await signedIn(ctx, request);
  if (me.role !== 'admin') throw new Refusal(403, 'only an admin can do this');
  return me;
}

function prizeOf(view: PublicShowView, caseNumber: number): string | null {
  const artifact = view.cases[caseNumber - 1]?.artifact ?? null;
  if (artifact === null) return null;
  const slot = view.prizeSlots.find((s) => s.slot === artifact.prizeSlot);
  return slot === undefined ? 'No prize' : prizeTitle(slot);
}

/** The user's case in one show: owned after the close, else their latest claim, else none. */
export function matchOf(model: ShowModel, view: PublicShowView, userId: string): Match | null {
  const owned = view.cases.find((c) => c.ownerId === userId);
  const claimed = model.claims.filter((c) => c.player.id === userId).at(-1);
  const caseNumber = owned?.number ?? (model.owners === null ? claimed?.caseNumber : undefined);
  if (caseNumber === undefined) return null;
  return {
    showId: model.id,
    state: model.state,
    createdAt: model.createdAt,
    caseNumber,
    owner: owned !== undefined,
    prize: prizeOf(view, caseNumber),
  };
}

export function accountRoutes(ctx: Ctx): void {
  const { app, auth, shows } = ctx;

  app.get('/api/admin/accounts', async (request) => {
    await admin(ctx, request);
    return (await auth.accounts.all()).filter((a) => !a.deleted).map(rowOf);
  });

  app.post<{ Params: { id: string } }>('/api/admin/accounts/:id', async (request) => {
    const me = await admin(ctx, request);
    const update = parseBody(AccountUpdateSchema, request.body);
    const account = await auth.accounts.byId(request.params.id);
    if (account === undefined || account.deleted)
      throw new Refusal(404, 'there is no such account');
    if (account.kind === 'website') {
      throw new Refusal(409, 'a website account takes its role and rank from the website');
    }
    if (account.id === me.id && update.role !== undefined && update.role !== 'admin') {
      throw new Refusal(409, 'an admin cannot take away their own admin role');
    }
    const changed: Account = {
      ...account,
      role: update.role ?? account.role,
      rank: update.rank ?? account.rank,
    };
    await auth.accounts.save(changed);
    auth.directory.update(changed);
    if (changed.role !== account.role) {
      const ended = await auth.sessions.removeForAccount(account.id);
      if (ended.length > 0) void auth.ends.end(ended);
    }
    return rowOf(changed);
  });

  app.get('/api/me/matches', async (request) => {
    const me = await signedIn(ctx, request);
    return shows
      .list()
      .map((model) => matchOf(model, publicView(model, auth.directory.lookup), me.id))
      .filter((m): m is Match => m !== null);
  });
}
