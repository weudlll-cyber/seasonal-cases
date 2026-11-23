/**
 * @file   apps/server/src/memberSummaryRoutes.test.ts
 * @brief  Tests the profile card for the website (GAME-INTEGRATION §7): the token, the proxy
 *         guard, an unknown player, "no data", and a real card within the contract's limits.
 */
import { showResult } from '@sc/domain';
import { afterEach, describe, expect, it } from 'vitest';

import type { Account } from './auth/accounts.js';
import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

const TOKEN = 'games-sync-token-of-the-test';
const WEBSITE = {
  SC_MODE: 'website',
  SC_PROXY_SECRET: 'proxy-secret-of-the-test',
  SC_WEBSITE_ORIGIN: 'https://site.example',
  SC_TRUSTED_PROXIES: '127.0.0.1',
  SC_WEBSITE_LOCAL_ORIGIN: 'http://127.0.0.1:9',
  SC_GAMES_SYNC_TOKEN: TOKEN,
};
const URL_OF = (user: string) => `/games/cases/api/website/member-summary?user=${user}`;
const ANA: Account = {
  id: 'acc-ana',
  kind: 'website',
  name: 'Ana',
  role: 'player',
  rank: 3,
  badges: [],
  websiteOrigin: 'https://site.example',
  websiteUserId: '7',
  deleted: false,
};

const ask = (
  h: Harness,
  user: string,
  headers: Record<string, string> = { 'x-games-sync-token': TOKEN },
) => h.server.app.inject({ method: 'GET', url: URL_OF(user), headers });

/** One ended show in which Ana owned case 2; answers the show's id. */
function endedShowWithAna(h: Harness): string {
  const { shows } = h.server;
  const olga = { id: 'olga', name: 'Olga' };
  const made = shows.createShow(olga, { cases: 4, winners: 2, labels: [] });
  if (!made.ok) throw new Error(made.error);
  const id = made.model.id;
  shows.openRegistration(id, olga.id);
  shows.claim(id, { id: ANA.id, name: 'Ana' }, 3, 2);
  shows.closeRegistration(id, olga.id);
  shows.fillWithBots(id);
  shows.seal(id, olga.id);
  shows.start(id, olga);
  shows.begin(id, olga.id);
  shows.endShow(id, olga.id);
  return id;
}

describe('the member summary', () => {
  it('needs the sync token and the website itself, not the public proxy', async () => {
    const h = await startHarness(false, WEBSITE);
    harness = h;
    await h.server.auth.accounts.save(ANA);
    expect((await ask(h, '7', {})).statusCode).toBe(401);
    expect((await ask(h, '7', { 'x-games-sync-token': 'wrong' })).statusCode).toBe(401);
    const proxied = await ask(h, '7', {
      'x-games-sync-token': TOKEN,
      'x-forwarded-for': '203.0.113.9',
    });
    expect(proxied.statusCode).toBe(404);
  });

  it('answers 404 for an unknown player and no data for one without a show', async () => {
    const h = await startHarness(false, WEBSITE);
    harness = h;
    await h.server.auth.accounts.save(ANA);
    expect((await ask(h, '99')).statusCode).toBe(404);
    expect((await ask(h, '7')).json()).toEqual({ noData: true });
  });

  it('counts the ended shows within the contract: 1-4 values, short labels, 4096 bytes', async () => {
    const h = await startHarness(false, WEBSITE);
    harness = h;
    await h.server.auth.accounts.save(ANA);
    const id = endedShowWithAna(h);
    const model = h.server.shows.get(id);
    if (model === undefined) throw new Error('no show');
    const won = showResult(model)?.winners.find((w) => w.caseNumber === 2);
    const answer = await ask(h, '7');
    expect(answer.statusCode).toBe(200);
    expect(answer.body.length).toBeLessThanOrEqual(4096);
    const card = answer.json<{
      values: { label: string; value: number }[];
      lastPlayedAt: string;
    }>();
    expect(card.values).toEqual([
      { label: 'Played', value: 1 },
      { label: 'Prizes', value: won === undefined ? 0 : 1 },
      { label: 'Main prizes', value: won?.slot === 1 ? 1 : 0 },
    ]);
    expect(card.values.every((v) => v.label.length >= 1 && v.label.length <= 24)).toBe(true);
    expect(new Date(card.lastPlayedAt).toISOString()).toBe(card.lastPlayedAt);
  });

  it('does not exist without the token or in local mode', async () => {
    const h = await startHarness(false, {
      ...WEBSITE,
      SC_WEBSITE_LOCAL_ORIGIN: '',
      SC_GAMES_SYNC_TOKEN: '',
    });
    harness = h;
    expect((await ask(h, '7')).statusCode).toBe(404);
    await h.close();
    harness = await startHarness(false);
    const local = await harness.server.app.inject({
      method: 'GET',
      url: '/api/website/member-summary?user=7',
    });
    expect(local.statusCode).toBe(404);
  });
});
