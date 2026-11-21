/**
 * @file   apps/server/src/showRoutes.ts
 * @brief  The routes for everyone: the mode, who am I, sign-out, the shows, one show's public
 *         view, and the player's claim.
 *
 * Responsibility: what the start page, the registration board and the result page read, and the
 *                 player's one action, the claim (CONCEPT §3.2). Every show leaves the server only
 *                 as its public view, with the players' current names and badges (the directory
 *                 of accounts). Guests read; claiming needs a signed-in player.
 * Depends on:     fastify, @sc/application (types), @sc/contracts, @sc/domain, ./http.js,
 *                 ./session.js
 */
import type { ShowService } from '@sc/application';
import { ClaimRequestSchema, type ShowState } from '@sc/contracts';
import { publicView, type ShowModel } from '@sc/domain';

import { accepted, parseBody, Refusal, signedIn, summary, type Ctx } from './http.js';
import { sessionOf, signOut } from './session.js';

interface IdParams {
  readonly id: string;
}

// Which show the start page and the stage follow: the newest live one, else the newest sealed,
// in registration, in setup, and only then the newest ended (night chain SC-N2, fix A).
const FOLLOW_ORDER: readonly ShowState[] = ['live', 'sealed', 'registration', 'setup', 'ended'];

/** The show the start page and the stage follow; `shows.list()` is newest first. */
export function currentShow(shows: ShowService): ShowModel | null {
  const all = shows.list();
  for (const state of FOLLOW_ORDER) {
    const found = all.find((m) => m.state === state);
    if (found !== undefined) return found;
  }
  return null;
}

export function showRoutes(ctx: Ctx): void {
  const { app, shows, auth, config } = ctx;
  const people = auth.directory.lookup;

  app.get('/api/health', () => ({ ok: true }));

  // What the client needs to know of the mode: the back link, the dock, the sign-in.
  app.get('/api/config', () => ({
    mode: config.mode,
    dev: config.dev,
    chatOrigin: config.chatOrigin,
  }));

  app.get('/api/me', async (request) => ({
    me: (await sessionOf(app, auth, request))?.me ?? null,
  }));

  app.post('/api/sign-out', async (request, reply) => {
    await signOut(app, auth, request, reply);
    return { ok: true };
  });

  app.get('/api/shows', () => shows.list().map(summary));

  app.get('/api/shows/current', () => {
    const model = currentShow(shows);
    return { show: model === null ? null : publicView(model, people) };
  });

  app.get<{ Params: IdParams }>('/api/shows/:id', (request) => {
    const model = shows.get(request.params.id);
    if (model === undefined) throw new Refusal(404, `there is no show ${request.params.id}`);
    return publicView(model, people);
  });

  app.post<{ Params: IdParams }>('/api/shows/:id/claim', async (request) => {
    const me = await signedIn(ctx, request);
    if (me.role !== 'player') throw new Refusal(403, 'only a player can pick a case');
    const { caseNumber } = parseBody(ClaimRequestSchema, request.body);
    return summary(accepted(shows.claim(request.params.id, me, me.rank, caseNumber)));
  });
}
