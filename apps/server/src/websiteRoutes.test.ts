/**
 * @file   apps/server/src/websiteRoutes.test.ts
 * @brief  Tests website mode: the sign-in route against the kit's check (untrusted, guest,
 *         invalid, member), the account mapping and the rights, a rename, the revocation through
 *         the account feed, and the base path.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { applyChange, parsePage } from './auth/accountFeed.js';
import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

const SECRET = 'proxy-secret-of-the-test';
const WEBSITE = {
  SC_MODE: 'website',
  SC_PROXY_SECRET: SECRET,
  SC_WEBSITE_ORIGIN: 'https://site.example',
  SC_TRUSTED_PROXIES: '127.0.0.1',
};
const ICON = '/media/step-icons/0123456789abcdef0123456789abcdef.webp';

function member(id: number, name: string, extra: Record<string, string> = {}) {
  const steps = [{ ladder: 'holder', name: 'Golden', icon: ICON }];
  return {
    'x-sc-proxy-secret': SECRET,
    'x-acting-user-id': String(id),
    'x-acting-user': name,
    'x-acting-user-roles': 'member',
    'x-acting-user-email-verified': 'true',
    'x-acting-user-can-host': 'false',
    'x-acting-user-steps': Buffer.from(JSON.stringify(steps)).toString('base64url'),
    ...extra,
  };
}

async function signInAs(h: Harness, headers: Record<string, string>, remoteAddress = '127.0.0.1') {
  return h.server.app.inject({
    method: 'GET',
    url: '/games/cases/auth/website?next=%2Fgames%2Fcases%2Fshow',
    headers,
    remoteAddress,
  });
}

const cookieOf = (set: string | string[] | undefined) =>
  (Array.isArray(set) ? set[0] : set)?.split(';')[0] ?? '';

describe('the website sign-in', () => {
  it('sets the cookie without Secure only in the test-only plain-cookie mode', async () => {
    harness = await startHarness(false, {
      ...WEBSITE,
      NODE_ENV: 'test',
      SC_TEST_PLAIN_COOKIE: '1',
    });
    const signedIn = await signInAs(harness, member(7, 'Ana'));
    // The kit's plain cookie (http) sits at the root; only the test-only mode ever has it here.
    expect(String(signedIn.headers['set-cookie'])).toMatch(/^sc_session=[^;]+;.*Path=\/;/);
    expect(String(signedIn.headers['set-cookie'])).not.toMatch(/Secure/);
  });

  it('refuses an untrusted peer and a wrong proxy secret', async () => {
    harness = await startHarness(false, WEBSITE);
    expect((await signInAs(harness, member(7, 'Ana'), '10.9.9.9')).statusCode).toBe(403);
    const wrong = { ...member(7, 'Ana'), 'x-sc-proxy-secret': 'nope' };
    expect((await signInAs(harness, wrong)).statusCode).toBe(403);
  });

  it('sends a guest to the website’s login and back, and refuses an invalid identity', async () => {
    harness = await startHarness(false, WEBSITE);
    const guest = await signInAs(harness, {
      'x-sc-proxy-secret': SECRET,
      'x-acting-guest': 'true',
    });
    expect(guest.statusCode).toBe(302);
    expect(guest.headers.location).toMatch(/^\/login\?next=%2Fgames%2Fcases%2Fauth%2Fwebsite/);
    const invalid = await signInAs(harness, { ...member(7, 'Ana'), 'x-acting-user-id': 'x' });
    expect(invalid.statusCode).toBe(403);
    expect(invalid.json()).toEqual({ error: 'NO_WEBSITE_USER' });
  });

  it('signs a member in under the base path with rank and badges, and keeps the account', async () => {
    harness = await startHarness(false, WEBSITE);
    const first = await signInAs(harness, member(7, 'Ana'));
    expect(first.statusCode).toBe(302);
    expect(first.headers.location).toBe('/games/cases/show');
    // Under the website's path: the `__Secure-` prefix, the base path, a lifetime of 7 days.
    expect(String(first.headers['set-cookie'])).toMatch(
      /^__Secure-sc_session=[^;]+; Max-Age=604800; Path=\/games\/cases;.*Secure/,
    );
    const me = async (cookie: string) =>
      (
        await harness?.server.app.inject({
          method: 'GET',
          url: '/games/cases/api/me',
          headers: { cookie },
        })
      )?.json<{
        me: {
          id: string;
          name: string;
          role: string;
          rank: number;
          badges: string[];
          steps?: unknown;
        };
      }>().me;
    const ana = await me(cookieOf(first.headers['set-cookie']));
    expect(ana).toMatchObject({ name: 'Ana', role: 'player', rank: 1, badges: [ICON] });
    // The steps as the kit gave them (ladder, name, icon): the header's chip draws them (D65).
    expect(ana?.steps).toEqual([{ ladder: 'holder', name: 'Golden', icon: ICON }]);
    // A rename applies at the next sign-in; the account stays the same.
    const again = await signInAs(harness, member(7, 'Anna'));
    expect(await me(cookieOf(again.headers['set-cookie']))).toMatchObject({
      id: ana?.id,
      name: 'Anna',
    });
  });

  it('maps a website admin to admin and a host of this game to organiser', async () => {
    harness = await startHarness(false, WEBSITE);
    const role = async (headers: Record<string, string>) => {
      const answer = await signInAs(harness as Harness, headers);
      const cookie = cookieOf(answer.headers['set-cookie']);
      const me = await harness?.server.app.inject({
        method: 'GET',
        url: '/games/cases/api/me',
        headers: { cookie },
      });
      return me?.json<{ me: { role: string } }>().me.role;
    };
    expect(await role(member(1, 'Ada', { 'x-acting-user-roles': 'admin' }))).toBe('admin');
    expect(await role(member(2, 'Hugo', { 'x-acting-user-can-host': 'true' }))).toBe('organiser');
    // "organiser" on the website alone gives no hosting right here (GAME-INTEGRATION §3).
    expect(await role(member(3, 'Ivy', { 'x-acting-user-roles': 'organiser' }))).toBe('player');
  });

  it('has no development routes and no root paths in website mode', async () => {
    harness = await startHarness(true, WEBSITE);
    const { app } = harness.server;
    expect(
      (await app.inject({ method: 'POST', url: '/games/cases/api/dev/sign-in', payload: {} }))
        .statusCode,
    ).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/healthz' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/games/cases/healthz' })).json()).toMatchObject(
      { status: 'ok' },
    );
  });
});

describe('the account feed', () => {
  it('reads only well-formed changes', () => {
    expect(
      parsePage({
        changes: [
          { id: 4, kind: 'locked' },
          { id: 'x', kind: 'locked' },
          { id: 5, kind: 'boom' },
        ],
        next: '9',
      }),
    ).toEqual({
      changes: [{ id: 4, kind: 'locked' }],
      next: '9',
    });
    expect(parsePage({ changes: 'no' })).toBeNull();
  });

  it('ends a locked member’s sessions and shows a deleted one as "deleted player"', async () => {
    harness = await startHarness(false, WEBSITE);
    const answer = await signInAs(harness, member(7, 'Ana'));
    const cookie = cookieOf(answer.headers['set-cookie']);
    const { auth } = harness.server;
    const deps = {
      ...auth,
      websiteOrigin: 'https://site.example',
      forget: (playerId: string, name: string) => harness?.server.shows.forget(playerId, name) ?? 0,
    };
    const me = () =>
      harness?.server.app.inject({
        method: 'GET',
        url: '/games/cases/api/me',
        headers: { cookie },
      });
    const id = (await me())?.json<{ me: { id: string } }>().me.id ?? '';
    await applyChange(deps, { id: 7, kind: 'locked' });
    expect((await me())?.json()).toEqual({ me: null });
    await applyChange(deps, { id: 7, kind: 'deleted' });
    await applyChange(deps, { id: 7, kind: 'deleted' });
    expect(auth.directory.lookup(id)?.name).toBe(`deleted player ${id.slice(0, 6)}`);
    // The stored account is erased too: no name, no badges (D61).
    expect(await auth.accounts.byId(id)).toMatchObject({
      name: `deleted player ${id.slice(0, 6)}`,
      badges: [],
      deleted: true,
    });
    // A deleted account cannot sign in again.
    expect((await signInAs(harness, member(7, 'Ana'))).statusCode).toBe(403);
  });
});
