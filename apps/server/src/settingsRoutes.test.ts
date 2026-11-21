/**
 * @file   apps/server/src/settingsRoutes.test.ts
 * @brief  Tests the settings: who reads and who changes them, the catalogue's check, and that a
 *         change reaches new shows only (DECISIONS D25).
 */
import { DEFAULT_SETTINGS, type PublicShowView, type Settings } from '@sc/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { settingsFrom } from './settings.js';
import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

const post = (h: Harness, url: string, payload: object, cookie: string) =>
  h.server.app.inject({ method: 'POST', url, payload, headers: { cookie } });
const get = (h: Harness, url: string, cookie = '') =>
  h.server.app.inject({ method: 'GET', url, headers: { cookie } });

const CHANGED: Settings = {
  ...DEFAULT_SETTINGS,
  defaultCases: 12,
  prizeArtifacts: [{ name: 'Moon Gem', season: 'winter' }],
  blankName: 'Dust',
  presentation: { travelMs: 1200, openMs: 2400, confetti: false },
};

describe('the settings', () => {
  it('are read by organisers and changed by admins only', async () => {
    const h = await startHarness();
    harness = h;
    const olga = await h.signIn('Olga', 'organiser');
    const ana = await h.signIn('Ana', 'player');
    const boss = await h.signIn('Boss', 'admin');
    expect((await get(h, '/api/settings', olga.cookie)).json()).toEqual(DEFAULT_SETTINGS);
    expect((await get(h, '/api/settings', ana.cookie)).statusCode).toBe(403);
    expect((await post(h, '/api/admin/settings', CHANGED, olga.cookie)).statusCode).toBe(403);
    expect((await post(h, '/api/admin/settings', CHANGED, boss.cookie)).json()).toEqual(CHANGED);
    expect((await get(h, '/api/settings', olga.cookie)).json()).toEqual(CHANGED);
  });

  it('refuse values outside the catalogue', async () => {
    const h = await startHarness();
    harness = h;
    const boss = await h.signIn('Boss', 'admin');
    const bad: Partial<Settings>[] = [
      { defaultCases: 4, defaultWinners: 5 },
      { relicName: 'Relic' },
      { presentation: { travelMs: 50, openMs: 1600, confetti: true } },
      { prizeArtifacts: [] },
    ];
    for (const change of bad) {
      const answer = await post(
        h,
        '/api/admin/settings',
        { ...DEFAULT_SETTINGS, ...change },
        boss.cookie,
      );
      expect(answer.statusCode).toBe(400);
    }
  });

  it('reach new shows only: a show keeps what it was created with', async () => {
    const h = await startHarness();
    harness = h;
    const boss = await h.signIn('Boss', 'admin');
    const setup = { cases: 4, winners: 1, labels: [] };
    const before = (await post(h, '/api/shows', setup, boss.cookie)).json<{ id: string }>().id;
    await post(h, '/api/admin/settings', CHANGED, boss.cookie);
    const after = (await post(h, '/api/shows', setup, boss.cookie)).json<{ id: string }>().id;
    const view = async (id: string) => (await get(h, `/api/shows/${id}`)).json<PublicShowView>();
    const old = await view(before);
    const fresh = await view(after);
    expect(old.artifactTable.map((a) => a.name)).toEqual(['Halving Stone', 'Fallen Leaf']);
    expect(old.presentation).toEqual(DEFAULT_SETTINGS.presentation);
    expect(fresh.artifactTable.map((a) => a.name)).toEqual(['Moon Gem', 'Dust']);
    expect(fresh.presentation).toEqual(CHANGED.presentation);
  });
});

describe('stored settings', () => {
  it('take the defaults for unknown or refused values', () => {
    expect(settingsFrom(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(settingsFrom({ blankName: 'Dust' })).toEqual({ ...DEFAULT_SETTINGS, blankName: 'Dust' });
    expect(settingsFrom({ defaultCases: 1000 })).toEqual(DEFAULT_SETTINGS);
  });
});
