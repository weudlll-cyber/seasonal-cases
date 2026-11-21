/**
 * @file   apps/server/src/showRoutes.ts
 * @brief  The routes for everyone: who am I, the shows, one show's public view, the claim.
 *
 * Responsibility: what the lobby, the registration board and the result screen read, and
 *                 the player's one action, the claim (CONCEPT §3.2). Every show leaves the
 *                 server only as its public view.
 * Depends on:     fastify, @sc/application (types), @sc/contracts, @sc/domain, ./http.js,
 *                 ./session.js
 */
import type { ShowService } from '@sc/application';
import { ClaimRequestSchema, type ShowState } from '@sc/contracts';
import { publicView, type ShowModel } from '@sc/domain';
import type { FastifyInstance } from 'fastify';

import { accepted, parseBody, Refusal, signedIn, summary } from './http.js';
import { sessionOf } from './session.js';

interface IdParams {
  readonly id: string;
}

// Which show the lobby and the stage follow: the newest live one, else the newest sealed, in
// registration, in setup, and only then the newest ended (night chain SC-N2, fix A).
const FOLLOW_ORDER: readonly ShowState[] = ['live', 'sealed', 'registration', 'setup', 'ended'];

/** The show the lobby and the stage follow; `shows.list()` is newest first. */
export function currentShow(shows: ShowService): ShowModel | null {
  const all = shows.list();
  for (const state of FOLLOW_ORDER) {
    const found = all.find((m) => m.state === state);
    if (found !== undefined) return found;
  }
  return null;
}

export function showRoutes(app: FastifyInstance, shows: ShowService): void {
  app.get('/api/health', () => ({ ok: true }));

  app.get('/api/me', (request) => ({ me: sessionOf(app, request) }));

  app.get('/api/shows', () => shows.list().map(summary));

  app.get('/api/shows/current', () => {
    const model = currentShow(shows);
    return { show: model === null ? null : publicView(model) };
  });

  app.get<{ Params: IdParams }>('/api/shows/:id', (request) => {
    const model = shows.get(request.params.id);
    if (model === undefined) throw new Refusal(404, `there is no show ${request.params.id}`);
    return publicView(model);
  });

  app.post<{ Params: IdParams }>('/api/shows/:id/claim', (request) => {
    const me = signedIn(app, request);
    if (me.role !== 'player') throw new Refusal(403, 'only a player can pick a case');
    const { caseNumber } = parseBody(ClaimRequestSchema, request.body);
    return summary(accepted(shows.claim(request.params.id, me, me.rank, caseNumber)));
  });
}
