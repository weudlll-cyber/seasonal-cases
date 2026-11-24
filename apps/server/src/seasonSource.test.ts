/**
 * @file   apps/server/src/seasonSource.test.ts
 * @brief  Tests the season of a new show: standalone and a non-https website origin give the date's
 *         season; in website mode the website's season feed decides once it has answered, and
 *         while it has not, or answers badly, the date's season stays.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WebsiteConfig } from './config.js';
import { seasonSource, type SeasonSource } from './seasonSource.js';

const SITE: WebsiteConfig = {
  trustedProxies: [],
  proxySecret: 'x',
  origin: 'https://site.example',
  loginPath: '/login',
  feed: null,
};
const NOVEMBER = '2026-11-21T20:00:00.000Z';
const FEED = {
  v: 1,
  inSeason: { season: 'spring', token: 'SPRING', since: '2026-03-05T22:32:17Z' },
  halvingDays: [],
};
const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );

let source: SeasonSource | undefined;
afterEach(() => {
  source?.stop();
  source = undefined;
});

describe('the season source', () => {
  it("is the date's in standalone mode and for a website that is not https", () => {
    source = seasonSource(null, vi.fn());
    expect(source.seasonAt(NOVEMBER)).toBe('autumn');
    source = seasonSource({ ...SITE, origin: 'http://localhost:5173' }, vi.fn());
    expect(source.seasonAt(NOVEMBER)).toBe('autumn');
  });

  it('follows the website once its feed has answered, and the date before that', async () => {
    const read = vi.fn(() => json(FEED));
    source = seasonSource(SITE, vi.fn(), read);
    expect(source.seasonAt(NOVEMBER)).toBe('autumn');
    await vi.waitFor(() => {
      expect(source?.seasonAt(NOVEMBER)).toBe('spring');
    });
    expect(read).toHaveBeenCalledWith('https://site.example/api/public/season', expect.anything());
  });

  it('stays with the date when the website answers badly', async () => {
    const read = vi.fn(() => json({ v: 2 }));
    source = seasonSource(SITE, vi.fn(), read);
    await vi.waitFor(() => {
      expect(read).toHaveBeenCalled();
    });
    expect(source.seasonAt(NOVEMBER)).toBe('autumn');
  });
});
