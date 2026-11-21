/**
 * @file   apps/server/src/organiserRoutes.ts
 * @brief  The organiser's routes in every mode: create a show and take it through registration,
 *         sealing and the start (CONCEPT §3.1–§3.3).
 *
 * Responsibility: an organiser or admin creates a show and opens registration, fills free cases
 *                 with bots, closes, seals and starts it; whoever starts holds the direction.
 *                 Each answers with the show's summary. The Quick Test stays a development route
 *                 (./devRoutes.ts).
 * Depends on:     @sc/application (types), @sc/contracts, ./http.js
 */
import type { ShowService } from '@sc/application';
import { CreateShowRequestSchema, type Me } from '@sc/contracts';

import { accepted, organiser, parseBody, summary, type Ctx } from './http.js';

interface IdParams {
  readonly id: string;
}

export function organiserRoutes(ctx: Ctx): void {
  const { app, shows } = ctx;

  app.post('/api/shows', async (request) => {
    const me = await organiser(ctx, request);
    const setup = parseBody(CreateShowRequestSchema, request.body);
    return summary(accepted(shows.createShow(me, setup)));
  });

  // The organiser's steps of one show.
  const steps: Record<string, (id: string, me: Me) => ReturnType<ShowService['seal']>> = {
    open: (id, me) => shows.openRegistration(id, me.id),
    close: (id, me) => shows.closeRegistration(id, me.id),
    bots: (id) => shows.fillWithBots(id),
    seal: (id, me) => shows.seal(id, me.id),
    start: (id, me) => shows.start(id, me),
  };
  for (const [path, step] of Object.entries(steps)) {
    app.post<{ Params: IdParams }>(`/api/shows/:id/${path}`, async (request) => {
      const me = await organiser(ctx, request);
      return summary(accepted(step(request.params.id, me)));
    });
  }
}
