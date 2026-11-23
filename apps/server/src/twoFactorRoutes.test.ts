/**
 * @file   apps/server/src/twoFactorRoutes.test.ts
 * @brief  Tests two-factor sign-in for standalone admins: the admin area waits for it, setup and
 *         confirmation, sign-in with a TOTP code (each step once) or a recovery code (each once),
 *         new recovery codes with the password and a current code (D35), and website mode
 *         without these routes.
 */
import { base32Decode, hotp, stepAt } from '@seasonal/kit/server';
import { afterEach, describe, expect, it } from 'vitest';

import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

const PASSWORD = 'a long enough secret';
const LOGIN = { login: 'olga', password: PASSWORD };

type Answer = Awaited<ReturnType<Harness['server']['app']['inject']>>;
const cookieOf = (answer: Answer): string => {
  const set = answer.headers['set-cookie'];
  const raw = Array.isArray(set) ? set[0] : set;
  return raw?.split(';')[0] ?? '';
};

// The sign-in limit counts per login and address (5 per 15 minutes); a second address gives the
// recovery part of the test its own allowance.
const post = (h: Harness, url: string, payload: object, cookie = '') =>
  h.server.app.inject({ method: 'POST', url, payload, headers: { cookie } });
const signInFrom = (h: Harness, payload: object, remoteAddress: string) =>
  h.server.app.inject({ method: 'POST', url: '/api/auth/sign-in', payload, remoteAddress });
const get = (h: Harness, url: string, cookie = '') =>
  h.server.app.inject({ method: 'GET', url, headers: { cookie } });

/** A registered local account made admin, signed in with its password only. */
async function localAdmin(h: Harness): Promise<string> {
  await post(h, '/api/auth/register', {
    name: 'Olga',
    email: 'olga@example.org',
    password: PASSWORD,
  });
  const account = (await h.server.auth.accounts.all()).find((a) => a.name === 'Olga');
  if (account === undefined) throw new Error('no account');
  await h.server.auth.accounts.save({ ...account, role: 'admin' });
  return cookieOf(await post(h, '/api/auth/sign-in', LOGIN));
}

describe('two-factor sign-in for a standalone admin', () => {
  it('is required for the admin area, set up with a code, then asked at every sign-in', async () => {
    const h = await startHarness(false);
    harness = h;
    const cookie = await localAdmin(h);
    expect((await get(h, '/api/admin/accounts', cookie)).statusCode).toBe(403);
    expect((await get(h, '/api/me/2fa', cookie)).json()).toEqual({
      required: true,
      enabled: false,
    });

    const setup = (await post(h, '/api/me/2fa/setup', {}, cookie)).json<{
      secret: string;
      uri: string;
    }>();
    expect(setup.uri).toMatch(/^otpauth:\/\/totp\/.*issuer=Seasonal%20Cases/);
    const secret = base32Decode(setup.secret);
    if (secret === null) throw new Error('not base32');
    const now = Date.now();
    // A code of none of the steps the server accepts (now and one either side).
    const window = [-1, 0, 1].map((d) => hotp(secret, stepAt(now) + d));
    let other = 0;
    while (window.includes(String(other).padStart(6, '0'))) other += 1;
    const wrong = { code: String(other).padStart(6, '0') };
    expect((await post(h, '/api/me/2fa/confirm', wrong, cookie)).statusCode).toBe(400);
    const confirmed = await post(
      h,
      '/api/me/2fa/confirm',
      { code: hotp(secret, stepAt(now)) },
      cookie,
    );
    const { recoveryCodes } = confirmed.json<{ recoveryCodes: string[] }>();
    expect(recoveryCodes).toHaveLength(10);
    expect(recoveryCodes[0]).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect((await get(h, '/api/admin/accounts', cookie)).statusCode).toBe(200);
    expect((await post(h, '/api/me/2fa/setup', {}, cookie)).statusCode).toBe(409);

    // The password alone opens no session now.
    const half = await post(h, '/api/auth/sign-in', LOGIN);
    expect(half.json()).toEqual({ twoFactor: true });
    expect(half.headers['set-cookie']).toBeUndefined();
    // The confirmed step is used up; the next one works once.
    const reused = await post(h, '/api/auth/sign-in', {
      ...LOGIN,
      code: hotp(secret, stepAt(now)),
    });
    expect(reused.statusCode).toBe(401);
    const next = { ...LOGIN, code: hotp(secret, stepAt(now) + 1) };
    expect((await post(h, '/api/auth/sign-in', next)).statusCode).toBe(200);
    expect((await post(h, '/api/auth/sign-in', next)).statusCode).toBe(401);
    // A recovery code works once.
    const recovery = { ...LOGIN, code: recoveryCodes[3] ?? '' };
    const rescued = await signInFrom(h, recovery, '10.0.0.2');
    expect(rescued.statusCode).toBe(200);
    expect((await get(h, '/api/me', cookieOf(rescued))).json()).toMatchObject({
      me: { role: 'admin' },
    });
    expect((await signInFrom(h, recovery, '10.0.0.2')).statusCode).toBe(401);
  });

  it('re-issues the recovery codes with the password and a current code, voiding the old', async () => {
    const h = await startHarness(false);
    harness = h;
    const cookie = await localAdmin(h);
    const setup = (await post(h, '/api/me/2fa/setup', {}, cookie)).json<{ secret: string }>();
    const secret = base32Decode(setup.secret);
    if (secret === null) throw new Error('not base32');
    const step = stepAt(Date.now());
    const old = (
      await post(h, '/api/me/2fa/confirm', { code: hotp(secret, step - 1) }, cookie)
    ).json<{ recoveryCodes: string[] }>().recoveryCodes;
    const signedIn = await post(h, '/api/auth/sign-in', { ...LOGIN, code: hotp(secret, step) });
    const session = cookieOf(signedIn);
    const url = '/api/me/2fa/recovery';
    const wrongPassword = { password: 'not the password', code: hotp(secret, step + 1) };
    expect((await post(h, url, wrongPassword, session)).statusCode).toBe(401);
    // A step already used (the sign-in's) is refused like a wrong one.
    const usedCode = { password: PASSWORD, code: hotp(secret, step) };
    expect((await post(h, url, usedCode, session)).statusCode).toBe(401);
    const answer = await post(
      h,
      url,
      { password: PASSWORD, code: hotp(secret, step + 1) },
      session,
    );
    expect(answer.statusCode).toBe(200);
    const fresh = answer.json<{ recoveryCodes: string[] }>().recoveryCodes;
    expect(fresh).toHaveLength(10);
    expect(fresh).not.toContain(old[0]);
    const withOld = { ...LOGIN, code: old[0] ?? '' };
    expect((await signInFrom(h, withOld, '10.0.0.3')).statusCode).toBe(401);
    const withNew = { ...LOGIN, code: fresh[0] ?? '' };
    expect((await signInFrom(h, withNew, '10.0.0.3')).statusCode).toBe(200);
    expect((await post(h, url, { password: PASSWORD, code: '123456' })).statusCode).toBe(401);
  });

  it('is not asked of a player', async () => {
    const h = await startHarness(false);
    harness = h;
    await post(h, '/api/auth/register', {
      name: 'Ana',
      email: 'ana@example.org',
      password: PASSWORD,
    });
    const answer = await post(h, '/api/auth/sign-in', { login: 'ana', password: PASSWORD });
    expect(answer.json()).toMatchObject({ name: 'Ana' });
    expect((await get(h, '/api/me/2fa', cookieOf(answer))).json()).toEqual({
      required: false,
      enabled: false,
    });
  });

  it('does not exist in website mode', async () => {
    const h = await startHarness(false, {
      SC_MODE: 'website',
      SC_PROXY_SECRET: 'proxy-secret-of-the-test',
      SC_WEBSITE_ORIGIN: 'https://site.example',
      SC_TRUSTED_PROXIES: '127.0.0.1',
    });
    harness = h;
    expect((await get(h, '/games/cases/api/me/2fa')).statusCode).toBe(404);
    expect((await post(h, '/games/cases/api/me/2fa/setup', {})).statusCode).toBe(404);
  });
});
