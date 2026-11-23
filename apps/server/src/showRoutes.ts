/**
 * @file   apps/server/src/showRoutes.ts
 * @brief  The routes for everyone: the mode, who am I, sign-out, the shows, one show's public
 *         view, the chronicle, and the player's claim.
 *
 * Responsibility: what the start page, the registration board and the result page read, and the
 *                 player's one action, the claim (CONCEPT §3.2). Every show leaves the server only
 *                 as its public view, with the players' current names and badges (the directory
 *                 of accounts). Guests read; claiming needs a signed-in player, 20 a minute, and
 *                 the address's budget shared with sign-ins (./addressLimit.ts, D37).
 * Depends on:     fastify, @sc/application (types), @sc/contracts, @sc/domain,
 *                 ./addressLimit.js (types), ./http.js, ./session.js
 */
import { RateLimiter } from '@seasonal/kit/server';
import type { ShowService } from '@sc/application';
import {
  CHRONICLE_LENGTH,
  ClaimRequestSchema,
  type ChronicleEntry,
  type ShowState,
} from '@sc/contracts';
import { publicView, showResult, type People, type ShowModel } from '@sc/domain';

import type { AddressLimit } from './addressLimit.js';
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

/** The chronicle: ended shows, newest first, each with its winners and its proof. */
export function chronicle(shows: ShowService, people: People): ChronicleEntry[] {
  const entries: ChronicleEntry[] = [];
  for (const model of shows.list()) {
    const result = showResult(model, people);
    if (result === null) continue;
    const { endedAt, winners, commitment, verified } = result;
    entries.push({
      id: model.id,
      endedAt,
      caseCount: model.caseCount,
      winners,
      commitment,
      verified,
    });
  }
  return entries.sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, CHRONICLE_LENGTH);
}

export function showRoutes(ctx: Ctx, perAddress: AddressLimit): void {
  const { app, shows, auth, config } = ctx;
  const people = auth.directory.lookup;

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

  app.get('/api/chronicle', () => chronicle(shows, people));

  app.get('/api/shows/current', () => {
    const model = currentShow(shows);
    return { show: model === null ? null : publicView(model, people) };
  });

  app.get<{ Params: IdParams }>('/api/shows/:id', (request) => {
    const model = shows.get(request.params.id);
    if (model === undefined) throw new Refusal(404, `there is no show ${request.params.id}`);
    return publicView(model, people);
  });

  // At most 20 claims a minute per player: a real pick needs a few (security pass 2, finding 3).
  const claims = new RateLimiter({ limit: 20, windowMs: 60_000 });
  app.post<{ Params: IdParams }>('/api/shows/:id/claim', async (request) => {
    const me = await signedIn(ctx, request);
    if (me.role !== 'player') throw new Refusal(403, 'only a player can pick a case');
    if (!claims.take(me.id).allowed) throw new Refusal(429, 'too many picks, wait a minute');
    // Behind the player's own limit: one budget per address with the sign-ins (D37).
    perAddress(request.ip);
    const { caseNumber } = parseBody(ClaimRequestSchema, request.body);
    return summary(accepted(shows.claim(request.params.id, me, me.rank, caseNumber)));
  });
}
