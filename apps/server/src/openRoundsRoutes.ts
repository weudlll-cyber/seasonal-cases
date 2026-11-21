/**
 * @file   apps/server/src/openRoundsRoutes.ts
 * @brief  The website's open sign-ups: `GET /api/public/open-rounds` (GAME-INTEGRATION §6).
 *
 * Responsibility: the contract of Seasonal Entertainment docs/OPEN-ROUNDS.md, version 1: public,
 *                 no sign-in, JSON, `Cache-Control: max-age=30`; only shows whose registration is
 *                 open now and that the organiser marked "show on the website" (`listed`), at
 *                 most 20, newest first; no personal data (the number of players, never names).
 *                 Shows have no start time and close by hand, so both times are null. A player
 *                 claims one case, so the cases are the most players. `joinUrl` is the game's
 *                 page on the website (website mode) or the public address (local mode); the
 *                 website takes https only.
 * Depends on:     @sc/application (types), @sc/contracts, @sc/domain, ./http.js (types)
 */
import type { ShowService } from '@sc/application';
import { OPEN_ROUNDS_MAX, type OpenRound, type OpenRoundsPage } from '@sc/contracts';
import { currentClaims, type ShowModel } from '@sc/domain';

import type { Ctx } from './http.js';

export const ROUND_KIND = 'Seasonal Cases';

function roundOf(model: ShowModel, joinUrl: string): OpenRound {
  return {
    id: model.id,
    title: `Seasonal Cases: ${String(model.caseCount)} cases, ${String(model.prizes.length)} prizes`,
    kind: ROUND_KIND,
    startsAt: null,
    signupClosesAt: null,
    players: currentClaims(model.claims).length,
    maxPlayers: model.caseCount,
    joinUrl,
  };
}

/** The page the website reads: open, listed registrations only, newest first. */
export function openRounds(shows: ShowService, joinUrl: string): OpenRoundsPage {
  const rounds = shows
    .list()
    .filter((m) => m.registrationOpen && m.listed)
    .slice(0, OPEN_ROUNDS_MAX)
    .map((m) => roundOf(m, joinUrl));
  return { version: 1, rounds };
}

export function openRoundsRoutes(ctx: Ctx): void {
  const { app, shows, config } = ctx;
  const origin = config.website?.origin ?? config.publicOrigin;
  const joinUrl = `${origin}${config.basePath}`;
  app.get('/api/public/open-rounds', (_request, reply) => {
    void reply.header('cache-control', 'public, max-age=30');
    return openRounds(shows, joinUrl);
  });
}
