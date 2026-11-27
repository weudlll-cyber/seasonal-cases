/**
 * @file   apps/server/src/accountDataRoutes.test.ts
 * @brief  Tests deleting one's own account and downloading one's own data (D61): the record shows
 *         "deleted player" and nothing personal is left in any store, the sealed show and its
 *         commitment stay, the password and a second factor's code are asked, the last admin is
 *         refused and told why, the export holds the account's own data and no secret, and a
 *         website member's account is left to the website.
 */
import { memoryStore } from '@sc/application';
import { afterEach, describe, expect, it } from 'vitest';

import { memoryAccounts, type Account } from './auth/accounts.js';
import { memoryCredentials } from './auth/credentials.js';
import { memoryPending } from './auth/pending.js';
import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

const PASSWORD = 'a long enough secret';
const ANA = { name: 'AnaExample', email: 'ana.example@example.org', password: PASSWORD };
const BO = { name: 'BoExample', email: 'bo.example@example.org', password: PASSWORD };

/** A harness whose stores the test can look into afterwards. */
async function started() {
  const stores = {
    events: memoryStore(),
    accounts: memoryAccounts(),
    credentials: memoryCredentials(),
    pending: memoryPending(),
  };
  const h = await startHarness(false, {}, stores);
  harness = h;
  return { h, stores };
}

const call = (
  h: Harness,
  method: 'GET' | 'POST',
  url: string,
  ...rest: [cookie?: string, payload?: object]
) =>
  h.server.app.inject({
    method,
    url,
    headers: { cookie: rest[0] ?? '' },
    ...(rest[1] ? { payload: rest[1] } : {}),
  });

/** Registers through the confirmation link, signs in; the cookie and the account's id. */
async function member(h: Harness, form: typeof ANA) {
  expect(await h.register(form)).toBe(200);
  const answer = await call(h, 'POST', '/api/auth/sign-in', '', {
    login: form.name,
    password: form.password,
  });
  const raw = answer.headers['set-cookie'];
  const cookie = (Array.isArray(raw) ? raw[0] : raw)?.split(';')[0] ?? '';
  return { cookie, id: answer.json<{ id: string }>().id };
}

/** A sealed show with Ana on case 3 and the registration closed. */
function showWith(h: Harness, who: { id: string; name: string }): string {
  const { shows } = h.server;
  const created = shows.createShow(
    { id: 'org', name: 'Olga' },
    { cases: 6, winners: 1, labels: [] },
  );
  if (!created.ok) throw new Error(created.error);
  const id = created.model.id;
  shows.openRegistration(id, 'org');
  shows.claim(id, who, 2, 3);
  shows.fillWithBots(id);
  shows.closeRegistration(id, 'org');
  shows.seal(id, 'org');
  return id;
}

const everything = (stores: Awaited<ReturnType<typeof started>>['stores']) =>
  JSON.stringify([[...stores.events.loadAll()], stores.accounts.all()]);

describe('deleting the account (D61)', () => {
  it('leaves "deleted player" in the shows and nothing personal in any store', async () => {
    const { h, stores } = await started();
    const ana = await member(h, ANA);
    const showId = showWith(h, { id: ana.id, name: ANA.name });
    const commitment = h.server.shows.get(showId)?.sealing?.commitment;
    expect(
      (await call(h, 'POST', '/api/me/delete', ana.cookie, { password: 'not it, no' })).statusCode,
    ).toBe(401);
    const done = await call(h, 'POST', '/api/me/delete', ana.cookie, { password: PASSWORD });
    expect(done.statusCode).toBe(200);
    // The sign-in is gone, with its name and its e-mail, and the session.
    expect((await call(h, 'GET', '/api/me', ana.cookie)).json()).toEqual({ me: null });
    expect(await stores.credentials.byAccount(ana.id)).toBeUndefined();
    expect(await stores.credentials.byEmail(ANA.email)).toBeUndefined();
    expect(await stores.credentials.byName(ANA.name.toLowerCase())).toBeUndefined();
    // The tombstone holds no name; the event log holds none either.
    const tomb = await stores.accounts.byId(ana.id);
    expect(tomb).toMatchObject({ deleted: true, role: 'player', rank: 0, steps: [] });
    const gone = `deleted player ${ana.id.slice(0, 6)}`;
    expect(tomb?.name).toBe(gone);
    const text = JSON.stringify([everything(stores), done.body]);
    expect(text).not.toContain(ANA.name);
    expect(text).not.toContain(ANA.email);
    // The shows show it, and the case, the sealing and the commitment are as they were.
    const view = (await call(h, 'GET', `/api/shows/${showId}`)).json<{
      cases: { number: number; ownerName: string | null }[];
    }>();
    expect(view.cases.find((c) => c.number === 3)?.ownerName).toBe(gone);
    expect(h.server.shows.get(showId)?.sealing?.commitment).toBe(commitment);
    expect(
      (await call(h, 'POST', '/api/auth/sign-in', '', { login: ANA.name, password: PASSWORD }))
        .statusCode,
    ).toBe(401);
  });

  it('frees the name and the e-mail, and drops a registration waiting for the e-mail', async () => {
    const { h, stores } = await started();
    const ana = await member(h, ANA);
    await stores.pending.put({
      tokenHash: 'h',
      email: ANA.email,
      name: 'Waiting',
      passwordHash: 'x',
      expiresAt: Date.now() + 60_000,
      mailedAt: Date.now(),
    });
    expect(
      (await call(h, 'POST', '/api/me/delete', ana.cookie, { password: PASSWORD })).statusCode,
    ).toBe(200);
    expect(await stores.pending.byEmail(ANA.email, Date.now())).toBeUndefined();
    expect(await h.register(ANA)).toBe(200);
  });

  it('asks for a current code of the second factor, when the account has one', async () => {
    const { h } = await started();
    const ana = await member(h, ANA);
    const { auth } = h.server;
    await auth.twoFactor.setUp(ana.id, new Uint8Array(20));
    await auth.twoFactor.enable(ana.id, 1, []);
    const without = await call(h, 'POST', '/api/me/delete', ana.cookie, { password: PASSWORD });
    expect(without.statusCode).toBe(401);
    expect(without.json()).toEqual({ error: 'Enter a current code of your second factor.' });
    const wrong = await call(h, 'POST', '/api/me/delete', ana.cookie, {
      password: PASSWORD,
      code: '000000',
    });
    expect(wrong.json()).toEqual({ error: 'Wrong code.' });
    expect((await auth.accounts.byId(ana.id))?.deleted).toBe(false);
  });

  it('refuses the last admin and says why; with another admin it goes through', async () => {
    const { h, stores } = await started();
    const ada = await member(h, ANA);
    const save = async (id: string, role: Account['role']) => {
      const found = await stores.accounts.byId(id);
      if (found !== undefined) await stores.accounts.save({ ...found, role });
    };
    await save(ada.id, 'admin');
    // The role is read at sign-in: a new session carries it.
    const again = await call(h, 'POST', '/api/auth/sign-in', '', {
      login: ANA.name,
      password: PASSWORD,
    });
    const raw = again.headers['set-cookie'];
    const cookie = (Array.isArray(raw) ? raw[0] : raw)?.split(';')[0] ?? '';
    const refused = await call(h, 'POST', '/api/me/delete', cookie, { password: PASSWORD });
    expect(refused.statusCode).toBe(409);
    expect(refused.json<{ error: string }>().error).toContain('last admin');
    expect((await stores.accounts.byId(ada.id))?.deleted).toBe(false);
    const bo = await member(h, BO);
    await save(bo.id, 'admin');
    expect(
      (await call(h, 'POST', '/api/me/delete', cookie, { password: PASSWORD })).statusCode,
    ).toBe(200);
  });
});

describe('what the security pass 6 found', () => {
  it('lets two admins delete themselves together only once: one admin always stays', async () => {
    const { h, stores } = await started();
    const ada = await member(h, ANA);
    const bo = await member(h, BO);
    for (const id of [ada.id, bo.id]) {
      const found = await stores.accounts.byId(id);
      if (found !== undefined) await stores.accounts.save({ ...found, role: 'admin' });
    }
    // The role is read at sign-in: new sessions carry it.
    const again = async (form: typeof ANA) => {
      const r = await call(h, 'POST', '/api/auth/sign-in', '', {
        login: form.name,
        password: PASSWORD,
      });
      const raw = r.headers['set-cookie'];
      return (Array.isArray(raw) ? raw[0] : raw)?.split(';')[0] ?? '';
    };
    const [adaCookie, boCookie] = [await again(ANA), await again(BO)];
    // A slow store, as PostgreSQL is: both deletions have asked "is there another admin" before
    // either has erased anything. Without the queue both would pass.
    const all = stores.accounts.all.bind(stores.accounts);
    stores.accounts.all = async () => {
      const answer = await all();
      await new Promise((resolve) => setTimeout(resolve, 40));
      return answer;
    };
    const answers = await Promise.all([
      call(h, 'POST', '/api/me/delete', adaCookie, { password: PASSWORD }),
      call(h, 'POST', '/api/me/delete', boCookie, { password: PASSWORD }),
    ]);
    expect(answers.map((a) => a.statusCode).sort()).toEqual([200, 409]);
    const left = (await stores.accounts.all()).filter((a) => a.role === 'admin' && !a.deleted);
    expect(left).toHaveLength(1);
  });

  it('keeps no cache from holding the downloaded file', async () => {
    const { h } = await started();
    const ana = await member(h, ANA);
    expect((await call(h, 'GET', '/api/me/export', ana.cookie)).headers['cache-control']).toBe(
      'no-store',
    );
  });

  it('takes a deleted name out of the shows at start, after a crash between the two steps', async () => {
    const { h, stores } = await started();
    const ana = await member(h, ANA);
    const showId = showWith(h, { id: ana.id, name: ANA.name });
    await h.close();
    // The crash: the tombstone was saved, the log was not rewritten.
    const found = await stores.accounts.byId(ana.id);
    if (found !== undefined) await stores.accounts.save({ ...found, deleted: true, name: 'x' });
    expect(JSON.stringify([...stores.events.loadAll()])).toContain(ANA.name);
    harness = await startHarness(false, {}, stores);
    expect(JSON.stringify([...stores.events.loadAll()])).not.toContain(ANA.name);
    const view = (await call(harness, 'GET', `/api/shows/${showId}`)).json<{
      cases: { number: number; ownerName: string | null }[];
    }>();
    expect(view.cases.find((c) => c.number === 3)?.ownerName).toBe(
      `deleted player ${ana.id.slice(0, 6)}`,
    );
  });
});

describe('downloading the data (D61)', () => {
  it('gives the account its own data as a file, with no secret in it', async () => {
    const { h } = await started();
    const ana = await member(h, ANA);
    const showId = showWith(h, { id: ana.id, name: ANA.name });
    const answer = await call(h, 'GET', '/api/me/export', ana.cookie);
    expect(answer.statusCode).toBe(200);
    expect(answer.headers['content-disposition']).toContain('attachment');
    const data = answer.json<{
      exportedAt: string;
      profile: Record<string, unknown>;
      matches: { showId: string; caseNumber: number; prize: string | null }[];
    }>();
    expect(data.profile).toEqual({ name: ANA.name, email: ANA.email, role: 'player', rank: 0 });
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0]).toMatchObject({ showId, caseNumber: 3, prize: null });
    expect(Number.isNaN(Date.parse(data.exportedAt))).toBe(false);
    // No password hash, no secret, no session.
    expect(answer.body).not.toMatch(/argon2|passwordHash|secret|recovery|session/i);
  });

  it('is for a signed-in standalone account only', async () => {
    const { h, stores } = await started();
    expect((await call(h, 'GET', '/api/me/export')).statusCode).toBe(401);
    const ana = await member(h, ANA);
    const found = await stores.accounts.byId(ana.id);
    if (found !== undefined) await stores.accounts.save({ ...found, kind: 'website' });
    const refused = await call(h, 'GET', '/api/me/export', ana.cookie);
    expect(refused.statusCode).toBe(403);
    expect(refused.json<{ error: string }>().error).toContain('website');
    expect(
      (await call(h, 'POST', '/api/me/delete', ana.cookie, { password: PASSWORD })).statusCode,
    ).toBe(403);
  });
});
