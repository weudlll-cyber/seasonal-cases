/**
 * @file   apps/server/src/devRoutes.ts
 * @brief  The development routes: sign-in by name, role and rank, and the Quick Test.
 *
 * Responsibility: the development sign-in (CONCEPT §10, DECISIONS D24): a fresh account of kind
 *                 `dev` per sign-in, so two tabs with one name are two people, and a session for
 *                 it; the Quick Test (CONCEPT §9). Registered only in local mode with
 *                 NODE_ENV=development and SC_DEV=1 (./app.ts); otherwise these paths answer 404.
 * Depends on:     node:crypto, @sc/contracts, ./auth/accounts.js, ./http.js, ./session.js
 */
import { randomUUID } from 'node:crypto';

import { QuickTestRequestSchema, SignInRequestSchema } from '@sc/contracts';

import type { Account, AccountRole } from './auth/accounts.js';
import { accepted, organiser, parseBody, summary, type Ctx } from './http.js';
import { signIn } from './session.js';

// The development sign-in offers the client's roles; a viewer signs in as a player of rank 0.
const ROLE_OF: Record<string, AccountRole> = {
  viewer: 'player',
  player: 'player',
  organiser: 'organiser',
  admin: 'admin',
};

export function devRoutes(ctx: Ctx): void {
  const { app, auth, shows } = ctx;

  app.post('/api/dev/sign-in', async (request, reply) => {
    const { name, role, rank } = parseBody(SignInRequestSchema, request.body);
    const account: Account = {
      id: randomUUID(),
      kind: 'dev',
      name,
      role: ROLE_OF[role] ?? 'player',
      rank: role === 'viewer' ? 0 : rank,
      steps: [],
      websiteOrigin: null,
      websiteUserId: null,
      deleted: false,
    };
    await auth.accounts.save(account);
    return signIn(ctx, request, reply, account);
  });

  app.post('/api/dev/quick-test', async (request) => {
    const me = await organiser(ctx, request);
    const { seed, ...setup } = parseBody(QuickTestRequestSchema, request.body);
    return summary(accepted(shows.quickTest({ ...setup, seed }, me)));
  });
}
