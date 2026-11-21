/**
 * @file   apps/server/src/localRoutes.test.ts
 * @brief  Tests standalone accounts: registration and its rules, sign-in by name or e-mail, the
 *         rate limit, the forgotten password with its one-time link, website mode without these
 *         routes, the admin's roles and ranks, and "My matches".
 */
import { afterEach, describe, expect, it } from 'vitest';

import { mailbox } from './mail.js';
import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

const PASSWORD = 'a long enough secret';
const ADA = { name: 'Ada', email: 'Ada@Example.org', password: PASSWORD };

type Answer = Awaited<ReturnType<Harness['server']['app']['inject']>>;
const cookieOf = (answer: Answer): string => {
  const set = answer.headers['set-cookie'];
  const raw = Array.isArray(set) ? set[0] : set;
  return raw?.split(';')[0] ?? '';
};

async function post(h: Harness, url: string, payload: object, cookie = '') {
  return h.server.app.inject({ method: 'POST', url, payload, headers: { cookie } });
}
async function get(h: Harness, url: string, cookie = '') {
  return h.server.app.inject({ method: 'GET', url, headers: { cookie } });
}

describe('registration and sign-in', () => {
  it('registers a player, signs in by name or e-mail, and refuses a taken name', async () => {
    harness = await startHarness(false);
    const made = await post(harness, '/api/auth/register', ADA);
    expect(made.statusCode).toBe(200);
    expect(made.json()).toMatchObject({ name: 'Ada', role: 'player', rank: 0 });
    const again = await post(harness, '/api/auth/register', {
      ...ADA,
      name: 'ADA',
      email: 'other@example.org',
    });
    expect(again.statusCode).toBe(409);
    expect((await post(harness, '/api/auth/register', { ...ADA, name: 'Bob' })).statusCode).toBe(
      409,
    );
    for (const login of ['ada', 'ADA@example.org']) {
      const answer = await post(harness, '/api/auth/sign-in', { login, password: PASSWORD });
      expect(answer.statusCode).toBe(200);
      const me = await get(harness, '/api/me', cookieOf(answer));
      expect(me.json()).toMatchObject({ me: { name: 'Ada' } });
    }
  });

  it('keeps the password and name rules of Mini Games', async () => {
    const h = await startHarness(false);
    harness = h;
    const weak = async (password: string) =>
      (await post(h, '/api/auth/register', { ...ADA, password })).json<{ error: string }>();
    expect((await weak('short')).error).toBe('The password needs at least 12 characters.');
    expect((await weak('Password1234')).error).toMatch(/too common/);
    // From the dictionary, not Mini Games' ten.
    expect((await weak('1qaz2wsx3edc')).error).toMatch(/too common/);
    const long = await post(harness, '/api/auth/register', { ...ADA, password: 'x'.repeat(129) });
    expect(long.statusCode).toBe(400);
    const name = await post(harness, '/api/auth/register', { ...ADA, name: 'a b' });
    expect(name.statusCode).toBe(400);
  });

  it('answers a wrong password like an unknown name, and limits the tries', async () => {
    harness = await startHarness(false);
    await post(harness, '/api/auth/register', ADA);
    const wrong = await post(harness, '/api/auth/sign-in', { login: 'ada', password: 'nope' });
    const unknown = await post(harness, '/api/auth/sign-in', { login: 'zed', password: 'nope' });
    expect(wrong.statusCode).toBe(401);
    expect(unknown.json()).toEqual(wrong.json());
    const codes: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      codes.push(
        (await post(harness, '/api/auth/sign-in', { login: 'ada', password: 'x' })).statusCode,
      );
    }
    expect(codes).toEqual([401, 401, 401, 401, 429]);
  });
});

describe('the registration limit', () => {
  it('counts only forms that pass the rules: five an hour per address', async () => {
    const h = await startHarness(false);
    harness = h;
    const make = async (i: number, password = PASSWORD) =>
      (
        await post(h, '/api/auth/register', {
          ...ADA,
          name: `ada${String(i)}`,
          email: `a${String(i)}@example.org`,
          password,
        })
      ).statusCode;
    for (let i = 0; i < 3; i += 1) expect(await make(i, 'short')).toBe(400);
    const codes: number[] = [];
    for (let i = 0; i < 6; i += 1) codes.push(await make(i));
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
  });
});

describe('the forgotten password', () => {
  it('mails a link that works once and ends every session', async () => {
    const box = mailbox();
    harness = await startHarness(false, {}, { mailer: box });
    const first = cookieOf(await post(harness, '/api/auth/register', ADA));
    expect(
      (await post(harness, '/api/auth/forgot', { email: 'nobody@example.org' })).json(),
    ).toEqual({ ok: true });
    await post(harness, '/api/auth/forgot', { email: 'ADA@example.org' });
    await expect.poll(() => box.sent.length).toBe(1);
    const mail = box.sent[0];
    expect(mail?.to).toBe('ada@example.org');
    const token = /token=([\w-]+)/.exec(mail?.text ?? '')?.[1] ?? '';
    const next = 'another long secret';
    expect((await post(harness, '/api/auth/reset', { token, password: next })).statusCode).toBe(
      200,
    );
    expect((await post(harness, '/api/auth/reset', { token, password: next })).statusCode).toBe(
      400,
    );
    expect((await get(harness, '/api/me', first)).json()).toEqual({ me: null });
    const old = await post(harness, '/api/auth/sign-in', { login: 'ada', password: PASSWORD });
    expect(old.statusCode).toBe(401);
    const fresh = await post(harness, '/api/auth/sign-in', { login: 'ada', password: next });
    expect(fresh.statusCode).toBe(200);
  });

  it('says so when no mail is set up', async () => {
    harness = await startHarness(false);
    const answer = await post(harness, '/api/auth/forgot', { email: 'ada@example.org' });
    expect(answer.statusCode).toBe(503);
  });

  it('does not exist in website mode', async () => {
    harness = await startHarness(false, {
      SC_MODE: 'website',
      SC_PROXY_SECRET: 'proxy-secret-of-the-test',
      SC_WEBSITE_ORIGIN: 'https://site.example',
      SC_TRUSTED_PROXIES: '127.0.0.1',
    });
    for (const path of ['register', 'sign-in', 'forgot', 'reset']) {
      const answer = await post(harness, `/games/cases/api/auth/${path}`, ADA);
      expect(answer.statusCode).toBe(404);
    }
  });
});

describe('the admin area', () => {
  it('lets an admin set roles and ranks, never on themselves or a website account', async () => {
    harness = await startHarness();
    const boss = await harness.signIn('Boss', 'admin');
    const ada = await harness.signIn('Ada', 'player');
    const adaSession = ada.cookie;
    const list = await get(harness, '/api/admin/accounts', boss.cookie);
    expect(list.json<{ name: string }[]>().map((a) => a.name)).toEqual(['Boss', 'Ada']);
    expect((await get(harness, '/api/admin/accounts', ada.cookie)).statusCode).toBe(403);
    const url = `/api/admin/accounts/${ada.me.id}`;
    expect((await post(harness, url, { rank: 4 }, boss.cookie)).json()).toMatchObject({ rank: 4 });
    expect((await get(harness, '/api/me', adaSession)).json()).toMatchObject({ me: { rank: 4 } });
    await post(harness, url, { role: 'organiser' }, boss.cookie);
    expect((await get(harness, '/api/me', adaSession)).json()).toEqual({ me: null });
    const self = await post(
      harness,
      `/api/admin/accounts/${boss.me.id}`,
      { role: 'player' },
      boss.cookie,
    );
    expect(self.statusCode).toBe(409);
    const site = {
      ...ada.me,
      role: 'player' as const,
      id: 'site-1',
      kind: 'website' as const,
      websiteOrigin: 'o',
      websiteUserId: '1',
      deleted: false,
    };
    await harness.server.auth.accounts.save(site);
    expect(
      (await post(harness, '/api/admin/accounts/site-1', { rank: 2 }, boss.cookie)).statusCode,
    ).toBe(409);
  });
});

describe('my matches', () => {
  it('lists my case per show, its prize only once the case is open', async () => {
    harness = await startHarness();
    const org = await harness.signIn('Olga', 'organiser');
    const ada = await harness.signIn('Ada', 'player', 2);
    const made = await post(
      harness,
      '/api/shows',
      { cases: 3, winners: 1, labels: ['Gold'] },
      org.cookie,
    );
    const id = made.json<{ id: string }>().id;
    await post(harness, `/api/shows/${id}/open`, {}, org.cookie);
    await post(harness, `/api/shows/${id}/claim`, { caseNumber: 2 }, ada.cookie);
    const before = (await get(harness, '/api/me/matches', ada.cookie)).json<unknown>();
    expect(before).toEqual([
      expect.objectContaining({ showId: id, caseNumber: 2, owner: false, prize: null }),
    ]);
    const { shows } = harness.server;
    shows.closeRegistration(id, org.me.id);
    shows.seal(id, org.me.id);
    shows.start(id, org.me);
    shows.begin(id, org.me.id);
    shows.select(id, org.me.id, 2);
    shows.step(id, org.me.id, 'open');
    const after = (await get(harness, '/api/me/matches', ada.cookie)).json<{ prize: string }[]>();
    expect(after[0]).toMatchObject({ owner: true });
    expect(['Prize 1 · Gold', 'No prize']).toContain(after[0]?.prize);
  });
});
