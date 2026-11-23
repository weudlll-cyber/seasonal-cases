/**
 * @file   apps/server/src/securityPass.test.ts
 * @brief  Tests the fixes of docs/security-pass.md: each case reproduces a finding and shows it
 *         closed (the numbers are the findings').
 */
import { memoryStore } from '@sc/application';
import { base32Decode, hotp, stepAt } from '@seasonal/kit/server';
import { afterEach, describe, expect, it } from 'vitest';

import { buildServer } from './app.js';
import { memoryAccounts } from './auth/accounts.js';
import { memorySessions } from './auth/sessions.js';
import { configFrom } from './config.js';
import { mailbox } from './mail.js';
import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

const PASSWORD = 'a long enough secret';
const OLGA = { name: 'Olga', email: 'olga@example.org', password: PASSWORD };

type Answer = Awaited<ReturnType<Harness['server']['app']['inject']>>;
const cookieOf = (answer: Answer): string => {
  const set = answer.headers['set-cookie'];
  const raw = Array.isArray(set) ? set[0] : set;
  return raw?.split(';')[0] ?? '';
};
const post = (h: Harness, url: string, payload: object, headers: Record<string, string> = {}) =>
  h.server.app.inject({ method: 'POST', url, payload, headers });
const me = async (h: Harness, cookie: string) =>
  (await h.server.app.inject({ method: 'GET', url: '/api/me', headers: { cookie } })).json<{
    me: { role: string } | null;
  }>().me;

/** Olga registered (registration signs nobody in, D36) and signed in with her password. */
async function registered(h: Harness): Promise<Answer> {
  await post(h, '/api/auth/register', OLGA);
  return post(h, '/api/auth/sign-in', { login: 'olga', password: PASSWORD });
}

/** Olga registered and made admin; answers a password-only session cookie. */
async function localAdmin(h: Harness): Promise<{ id: string; cookie: string }> {
  await post(h, '/api/auth/register', OLGA);
  const account = (await h.server.auth.accounts.all()).find((a) => a.name === 'Olga');
  if (account === undefined) throw new Error('no account');
  await h.server.auth.accounts.save({ ...account, role: 'admin' });
  return {
    id: account.id,
    cookie: cookieOf(await post(h, '/api/auth/sign-in', { login: 'olga', password: PASSWORD })),
  };
}

describe('1: limits count the visitor behind the proxy', () => {
  it('lets the right password in from another visitor after five wrong ones', async () => {
    const h = await startHarness(false);
    harness = h;
    await post(h, '/api/auth/register', OLGA);
    const from = (ip: string) => ({ 'x-forwarded-for': ip });
    for (let i = 0; i < 5; i += 1) {
      await post(
        h,
        '/api/auth/sign-in',
        { login: 'olga', password: 'wrong one' },
        from('203.0.113.9'),
      );
    }
    const blocked = await post(
      h,
      '/api/auth/sign-in',
      { login: 'olga', password: PASSWORD },
      from('203.0.113.9'),
    );
    expect(blocked.statusCode).toBe(429);
    const other = await post(
      h,
      '/api/auth/sign-in',
      { login: 'olga', password: PASSWORD },
      from('198.51.100.7'),
    );
    expect(other.statusCode).toBe(200);
  });
});

describe('2 and 6: confirming two-factor sign-in', () => {
  it('ends the password-only sessions elsewhere, and enables only once', async () => {
    const h = await startHarness(false);
    harness = h;
    const { cookie } = await localAdmin(h);
    const elsewhere = cookieOf(
      await post(h, '/api/auth/sign-in', { login: 'olga', password: PASSWORD }),
    );
    const setup = (await post(h, '/api/me/2fa/setup', {}, { cookie })).json<{ secret: string }>();
    const secret = base32Decode(setup.secret);
    if (secret === null) throw new Error('not base32');
    const code = { code: hotp(secret, stepAt(Date.now())) };
    const [a, b] = await Promise.all([
      post(h, '/api/me/2fa/confirm', code, { cookie }),
      post(h, '/api/me/2fa/confirm', code, { cookie }),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409]);
    expect(await me(h, elsewhere)).toBeNull();
    expect(await me(h, cookie)).toMatchObject({ role: 'admin' });
  });
});

describe('3: writes from another site', () => {
  it('are refused by Origin, by Sec-Fetch-Site, and as a plain-text form', async () => {
    const h = await startHarness();
    harness = h;
    const { cookie } = await h.signIn('Olga', 'organiser');
    const url = '/api/shows';
    const setup = { cases: 4, winners: 1, labels: [] };
    expect((await post(h, url, setup, { cookie, origin: 'http://evil.example' })).statusCode).toBe(
      403,
    );
    expect((await post(h, url, setup, { cookie, 'sec-fetch-site': 'same-site' })).statusCode).toBe(
      403,
    );
    const form = await h.server.app.inject({
      method: 'POST',
      url: '/api/sign-out',
      payload: 'x=1',
      headers: { cookie, 'content-type': 'text/plain' },
    });
    expect(form.statusCode).toBe(415);
    expect(
      (await post(h, url, setup, { cookie, 'sec-fetch-site': 'same-origin' })).statusCode,
    ).toBe(200);
  });
});

describe('4 and 9: the public address', () => {
  it('makes the cookie Secure behind https, and is required of a server that mails', async () => {
    const h = await startHarness(false, { SC_PUBLIC_ORIGIN: 'https://cases.example' });
    harness = h;
    const made = await registered(h);
    expect(String(made.headers['set-cookie'])).toMatch(/; Secure/);
    expect(() => configFrom({ SC_SMTP_HOST: '127.0.0.1' })).toThrow(/SC_PUBLIC_ORIGIN/);
    expect(
      configFrom({ SC_SMTP_HOST: '127.0.0.1', NODE_ENV: 'development', SC_DEV: '1' }).publicOrigin,
    ).toBe('http://localhost:5470');
  });
});

describe('7: a reset ends the older links', () => {
  it('leaves the first link dead after the second was used', async () => {
    const box = mailbox();
    const h = await startHarness(false, {}, { mailer: box });
    harness = h;
    await post(h, '/api/auth/register', OLGA);
    await post(h, '/api/auth/forgot', { email: OLGA.email });
    await post(h, '/api/auth/forgot', { email: OLGA.email });
    // The registration's own mail, then the two links.
    await expect.poll(() => box.sent.length).toBe(3);
    const [first, second] = box.sent.slice(1).map((m) => /token=([\w-]+)/.exec(m.text)?.[1] ?? '');
    const next = 'another long secret';
    expect((await post(h, '/api/auth/reset', { token: second, password: next })).statusCode).toBe(
      200,
    );
    expect((await post(h, '/api/auth/reset', { token: first, password: next })).statusCode).toBe(
      400,
    );
  });
});

describe('10: two-factor sign-in is set up only where it is asked', () => {
  it('refuses the setup to a player', async () => {
    const h = await startHarness(false);
    harness = h;
    const cookie = cookieOf(await registered(h));
    expect((await post(h, '/api/me/2fa/setup', {}, { cookie })).statusCode).toBe(409);
  });
});

describe('12: development accounts outside development', () => {
  it('sign nobody in once the development features are off', async () => {
    const stores = {
      events: memoryStore(),
      accounts: memoryAccounts(),
      sessions: memorySessions(),
    };
    const env = { SC_COOKIE_SECRET: 'test-secret-'.repeat(4), SC_PORT: '0' };
    const dev = await buildServer(
      configFrom({ ...env, NODE_ENV: 'development', SC_DEV: '1' }),
      stores,
    );
    const signedIn = await dev.app.inject({
      method: 'POST',
      url: '/api/dev/sign-in',
      payload: { name: 'Boss', role: 'admin', rank: 0 },
    });
    const cookie = cookieOf(signedIn);
    await dev.app.close();
    const real = await buildServer(configFrom(env), stores);
    const answer = await real.app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(answer.json()).toEqual({ me: null });
    await real.app.close();
  });
});
