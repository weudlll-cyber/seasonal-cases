/**
 * @file   apps/server/src/openRoundsRoutes.ts
 * @brief  The website's open sign-ups: `GET /api/public/open-rounds` (GAME-INTEGRATION §6).
 *
 * Responsibility: the game's rounds for Seasonal Entertainment docs/OPEN-ROUNDS.md, version 1:
 *                 public, no sign-in; only shows whose registration is open now and that the
 *                 organiser marked "show on the website" (`listed`), newest first; no personal
 *                 data (the number of players, never names). Shows have no start time and close
 *                 by hand, so both times are null. A player claims one case, so the cases are
 *                 the most players. `joinUrl` is the game's page on the website (website mode) or
 *                 the public address (local mode). The kit's `openRoundsPage` (v0.11.0) builds
 *                 the page and applies the website's checks (at most 20, lengths, an https
 *                 `joinUrl` on the game's origin); a round it leaves out is logged once, by id.
 * Depends on:     @seasonal/kit/server, @sc/application (types), @sc/contracts, @sc/domain, ./http.js (types)
 */
import {
  OPEN_ROUNDS_CACHE_CONTROL,
  openRoundsPage,
  type OpenRoundDrop,
  type OpenRoundInput,
  type OpenRoundsPage,
} from '@seasonal/kit/server';
import type { ShowService } from '@sc/application';
import { counted } from '@sc/contracts';
import { currentClaims, type ShowModel } from '@sc/domain';

import type { Ctx } from './http.js';

const ROUND_KIND = 'Seasonal Cases';

function roundOf(model: ShowModel, joinUrl: string): OpenRoundInput {
  return {
    id: model.id,
    title: `Seasonal Cases: ${counted(model.caseCount, 'case')}, ${counted(model.prizes.length, 'prize')}`,
    kind: ROUND_KIND,
    startsAt: null,
    signupClosesAt: null,
    players: currentClaims(model.claims).length,
    maxPlayers: model.caseCount,
    joinUrl,
  };
}

/** The page the website reads: open, listed registrations only, newest first. */
function openRounds(
  shows: ShowService,
  origin: string,
  joinUrl: string,
  onDrop: (id: string, why: OpenRoundDrop) => void,
): OpenRoundsPage {
  const rounds = shows
    .list()
    .filter((m) => m.registrationOpen && m.listed)
    .map((m) => roundOf(m, joinUrl));
  return openRoundsPage(rounds, { origin, onDrop });
}

export function openRoundsRoutes(ctx: Ctx): void {
  const { app, shows, config } = ctx;
  const origin = config.website?.origin ?? config.publicOrigin;
  const joinUrl = `${origin}${config.basePath}`;
  // Each show's drop is logged once: the route is public and read every minute (security pass
  // 4, finding 6).
  const told = new Set<string>();
  const onDrop = (id: string, why: OpenRoundDrop): void => {
    if (told.has(id)) return;
    told.add(id);
    app.log.warn({ event: 'open-round-dropped', showId: id, why });
  };
  app.get('/api/public/open-rounds', (_request, reply) => {
    void reply.header('cache-control', OPEN_ROUNDS_CACHE_CONTROL);
    return openRounds(shows, origin, joinUrl, onDrop);
  });
}
