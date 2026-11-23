/**
 * @file   apps/server/src/showRules.test.ts
 * @brief  Tests the show rules of night chain SC-N4 piece 2 on the server: bots fill cases in
 *         development only (DECISIONS D34), and a show without bots keeps its free cases
 *         unclaimed.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

const SETUP = { cases: 4, winners: 1, labels: [] };
const post = (h: Harness, url: string, cookie: string, payload: object = {}) =>
  h.server.app.inject({ method: 'POST', url, payload, headers: { cookie } });

/** A registered account made organiser, signed in with its password. */
async function localOrganiser(h: Harness): Promise<string> {
  const olga = { name: 'Olga', email: 'olga@example.org', password: 'a long enough secret' };
  await h.register(olga);
  const found = (await h.server.auth.accounts.all()).find((a) => a.name === 'Olga');
  if (found === undefined) throw new Error('no account');
  await h.server.auth.accounts.save({ ...found, role: 'organiser' });
  const signedIn = await h.server.app.inject({
    method: 'POST',
    url: '/api/auth/sign-in',
    payload: { login: 'olga', password: olga.password },
  });
  const set = signedIn.headers['set-cookie'];
  return (Array.isArray(set) ? set[0] : set)?.split(';')[0] ?? '';
}

describe('bots', () => {
  it('are refused outside development, so a real show keeps its free cases', async () => {
    const h = await startHarness(false);
    harness = h;
    const cookie = await localOrganiser(h);
    const { id } = (await post(h, '/api/shows', cookie, SETUP)).json<{ id: string }>();
    await post(h, `/api/shows/${id}/open`, cookie);
    const bots = await post(h, `/api/shows/${id}/bots`, cookie);
    expect(bots.statusCode).toBe(403);
    expect(bots.json()).toEqual({ error: 'bots exist in development only' });
    expect((await post(h, `/api/shows/${id}/close`, cookie)).statusCode).toBe(200);
    expect((await post(h, `/api/shows/${id}/seal`, cookie)).statusCode).toBe(200);
  });

  it('fill the free cases in development', async () => {
    const h = await startHarness();
    harness = h;
    const { cookie } = await h.signIn('Olga', 'organiser');
    const { id } = (await post(h, '/api/shows', cookie, SETUP)).json<{ id: string }>();
    await post(h, `/api/shows/${id}/open`, cookie);
    expect((await post(h, `/api/shows/${id}/bots`, cookie)).statusCode).toBe(200);
  });
});
