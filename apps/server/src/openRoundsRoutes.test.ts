/**
 * @file   apps/server/src/openRoundsRoutes.test.ts
 * @brief  Tests the website's open sign-ups: the contract's page, only open and listed
 *         registrations, no names, the join address of each mode.
 */
import { OpenRoundsPageSchema } from '@sc/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

describe('the open rounds', () => {
  it('list open, listed registrations only, with counts and no names', async () => {
    const h = await startHarness(true, { SC_PUBLIC_ORIGIN: 'https://cases.example' });
    harness = h;
    const { shows } = h.server;
    const olga = { id: 'olga', name: 'Olga' };
    const id = (o: ReturnType<typeof shows.createShow>) => (o.ok ? o.model.id : 'refused');
    const listed = id(shows.createShow(olga, { cases: 6, winners: 2, labels: [], listed: true }));
    const quiet = id(shows.createShow(olga, { cases: 6, winners: 2, labels: [] }));
    const notOpen = id(shows.createShow(olga, { cases: 6, winners: 2, labels: [], listed: true }));
    shows.openRegistration(listed, olga.id);
    shows.openRegistration(quiet, olga.id);
    shows.claim(listed, { id: 'ana', name: 'Ana' }, 3, 2);
    shows.claim(listed, { id: 'ana', name: 'Ana' }, 3, 4);
    shows.claim(listed, { id: 'bo', name: 'Bo' }, 1, 4);
    const answer = await h.server.app.inject({ method: 'GET', url: '/api/public/open-rounds' });
    expect(answer.headers['cache-control']).toBe('public, max-age=30');
    const page = OpenRoundsPageSchema.parse(answer.json());
    expect(page.rounds.map((r) => r.id)).toEqual([listed]);
    expect(page.rounds[0]).toMatchObject({
      kind: 'Seasonal Cases',
      players: 2,
      maxPlayers: 6,
      startsAt: null,
      joinUrl: 'https://cases.example/',
    });
    expect(answer.body).not.toContain('Ana');
    expect(page.rounds.map((r) => r.id)).not.toContain(notOpen);
  });

  it('send the website visitor to the game under the website', async () => {
    const h = await startHarness(false, {
      SC_MODE: 'website',
      SC_PROXY_SECRET: 'proxy-secret-of-the-test',
      SC_WEBSITE_ORIGIN: 'https://site.example',
      SC_TRUSTED_PROXIES: '127.0.0.1',
    });
    harness = h;
    const { shows } = h.server;
    const made = shows.createShow(
      { id: 'o', name: 'O' },
      { cases: 4, winners: 1, labels: [], listed: true },
    );
    if (!made.ok) throw new Error(made.error);
    shows.openRegistration(made.model.id, 'o');
    const answer = await h.server.app.inject({
      method: 'GET',
      url: '/games/cases/api/public/open-rounds',
    });
    expect(OpenRoundsPageSchema.parse(answer.json()).rounds[0]?.joinUrl).toBe(
      'https://site.example/games/cases/',
    );
  });
});
