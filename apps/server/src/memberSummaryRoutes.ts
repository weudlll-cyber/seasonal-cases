/**
 * @file   apps/server/src/memberSummaryRoutes.ts
 * @brief  `GET /api/website/member-summary?user=<website user id>`: a member's card on the
 *         website's profile (GAME-INTEGRATION §7).
 *
 * Responsibility: the contract, server to server: the games' sync token in
 *                 `X-Games-Sync-Token`, compared in constant time (the kit's `secretMatches`),
 *                 401 without it; a request that came through a proxy (it carries
 *                 X-Forwarded-For) is not the website's own and answers 404, so the public route
 *                 never serves it even if the proxy forgot to deny it. The answer counts only
 *                 ended shows, whose content is public: "Played" (shows the member owned a case
 *                 in), "Prizes" (prize cases owned), "Main prizes" (prize 1), and `lastPlayedAt`,
 *                 the newest such show's end. A member without a show answers `{ noData: true }`,
 *                 an unknown member 404. Registered only in website mode with the feed's token.
 * Depends on:     @seasonal/kit/server, @sc/application (types), @sc/domain (types), ./http.js
 */
import { secretMatches } from '@seasonal/kit/server';
import type { ShowService } from '@sc/application';
import type { ShowModel } from '@sc/domain';

import type { Ctx } from './http.js';

const MAIN_PRIZE = 1;

export interface MemberSummary {
  readonly values: readonly { readonly label: string; readonly value: number }[];
  readonly lastPlayedAt: string | null;
}

// The prize slot behind each case the account owned in an ended show; null: no prize.
function ownedSlots(model: ShowModel, accountId: string): (number | null)[] {
  if (model.state !== 'ended' || model.owners === null || model.sealing === null) return [];
  const prizes = new Map(model.prizes.map((p) => [p.id, p.prizeSlot]));
  return model.sealing.assignment
    .filter((entry) => model.owners?.[entry.caseNumber - 1]?.player.id === accountId)
    .map((entry) => prizes.get(entry.artifactId) ?? null);
}

/** The member's card, or null when they own no case in an ended show. */
export function memberSummary(shows: ShowService, accountId: string): MemberSummary | null {
  let played = 0;
  let prizes = 0;
  let main = 0;
  let last: string | null = null;
  for (const model of shows.list()) {
    const slots = ownedSlots(model, accountId);
    if (slots.length === 0) continue;
    played += 1;
    prizes += slots.filter((s) => s !== null).length;
    main += slots.filter((s) => s === MAIN_PRIZE).length;
    if (model.endedAt !== null && (last === null || model.endedAt > last)) last = model.endedAt;
  }
  if (played === 0) return null;
  const values = [
    { label: 'Played', value: played },
    { label: 'Prizes', value: prizes },
    { label: 'Main prizes', value: main },
  ];
  return { values, lastPlayedAt: last };
}

export function memberSummaryRoutes(ctx: Ctx, websiteOrigin: string, syncToken: string): void {
  const { app, auth, shows } = ctx;
  const tokenMatches = secretMatches(syncToken);

  app.get<{ Querystring: { user?: string } }>(
    '/api/website/member-summary',
    async (request, reply) => {
      void reply.header('cache-control', 'no-store');
      if (request.headers['x-forwarded-for'] !== undefined) {
        return reply.code(404).send({ error: 'not found' });
      }
      if (!tokenMatches(request.headers['x-games-sync-token'])) {
        return reply.code(401).send({ error: 'unauthorized' });
      }
      const user = request.query.user ?? '';
      const account = user === '' ? undefined : await auth.accounts.byWebsite(websiteOrigin, user);
      if (account === undefined) return reply.code(404).send({ error: 'no such player' });
      return memberSummary(shows, account.id) ?? { noData: true };
    },
  );
}
