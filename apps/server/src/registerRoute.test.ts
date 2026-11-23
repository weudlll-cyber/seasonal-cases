/**
 * @file   apps/server/src/registerRoute.test.ts
 * @brief  Tests registration with its confirmation link (D36, D42): one answer for every e-mail,
 *         nothing exists before the link, the link works once and for 24 hours, a second
 *         registration refreshes the mail once a minute at most, names are reserved only by
 *         accounts, the mail limit per address, and the races at the link.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { memoryCredentials } from './auth/credentials.js';
import { mailbox } from './mail.js';
import { REGISTER_MIN_MS } from './registerRoute.js';
import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  vi.useRealTimers();
  await harness?.close();
  harness = undefined;
});

const PASSWORD = 'a long enough secret';
const ADA = { name: 'Ada', email: 'ada@example.org', password: PASSWORD };
const MINUTE = 60_000;

async function post(h: Harness, url: string, payload: object) {
  return h.server.app.inject({ method: 'POST', url, payload });
}

const signIn = (h: Harness, login: string) =>
  post(h, '/api/auth/sign-in', { login, password: PASSWORD });

/** The confirmation tokens mailed so far, oldest first. */
const tokensIn = (box: ReturnType<typeof mailbox>): string[] =>
  box.sent.flatMap((m) => /confirm\?token=([\w-]+)/.exec(m.text)?.[1] ?? []);

async function started(): Promise<{ h: Harness; box: ReturnType<typeof mailbox> }> {
  const box = mailbox();
  const h = await startHarness(false, {}, { mailer: box });
  harness = h;
  return { h, box };
}

describe('the confirmation link (D42)', () => {
  it('makes the account only once the link is used; before that a sign-in reveals nothing', async () => {
    const { h, box } = await started();
    expect((await post(h, '/api/auth/register', ADA)).json()).toEqual({ ok: true });
    await expect.poll(() => tokensIn(box).length).toBe(1);
    const unknown = await signIn(h, 'nobody');
    for (const login of ['ada', 'ada@example.org']) {
      const before = await signIn(h, login);
      expect(before.statusCode).toBe(401);
      expect(before.json()).toEqual(unknown.json());
    }
    const confirmed = await post(h, '/api/auth/confirm', { token: tokensIn(box)[0] ?? '' });
    expect(confirmed.json()).toEqual({ name: 'Ada' });
    expect(confirmed.headers['set-cookie']).toBeUndefined();
    expect((await signIn(h, 'ada')).statusCode).toBe(200);
  });

  it('works once, and never with a token it did not send', async () => {
    const { h, box } = await started();
    await post(h, '/api/auth/register', ADA);
    await expect.poll(() => tokensIn(box).length).toBe(1);
    const token = tokensIn(box)[0] ?? '';
    expect((await post(h, '/api/auth/confirm', { token })).statusCode).toBe(200);
    const again = await post(h, '/api/auth/confirm', { token });
    expect(again.statusCode).toBe(400);
    expect(again.json()).toEqual({ error: 'This link no longer works: register again.' });
    const made = await post(h, '/api/auth/confirm', { token: 'x'.repeat(43) });
    expect(made.statusCode).toBe(400);
  });

  it('expires after 24 hours', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { h, box } = await started();
    await post(h, '/api/auth/register', ADA);
    await expect.poll(() => tokensIn(box).length).toBe(1);
    vi.setSystemTime(Date.now() + 24 * 60 * MINUTE + 1);
    const late = await post(h, '/api/auth/confirm', { token: tokensIn(box)[0] ?? '' });
    expect(late.statusCode).toBe(400);
    expect((await signIn(h, 'ada')).statusCode).toBe(401);
  });

  it('answers a second registration alike and mails again once a minute at most, the newest link alone working', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { h, box } = await started();
    await post(h, '/api/auth/register', ADA);
    await expect.poll(() => box.sent.length).toBe(1);
    const soon = await post(h, '/api/auth/register', { ...ADA, name: 'Adele' });
    expect(soon.json()).toEqual({ ok: true });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(box.sent).toHaveLength(1);
    vi.setSystemTime(Date.now() + MINUTE + 1);
    await post(h, '/api/auth/register', { ...ADA, name: 'Adele' });
    await expect.poll(() => box.sent.length).toBe(2);
    const [first, second] = tokensIn(box);
    expect((await post(h, '/api/auth/confirm', { token: first ?? '' })).statusCode).toBe(400);
    expect((await post(h, '/api/auth/confirm', { token: second ?? '' })).json()).toEqual({
      name: 'Adele',
    });
  });

  it('reserves a name only by an account: the first link used wins, the other must re-register', async () => {
    const { h, box } = await started();
    await post(h, '/api/auth/register', ADA);
    await post(h, '/api/auth/register', { ...ADA, email: 'other@example.org' });
    await expect.poll(() => tokensIn(box).length).toBe(2);
    const [mine, theirs] = tokensIn(box);
    expect((await post(h, '/api/auth/confirm', { token: theirs ?? '' })).statusCode).toBe(200);
    const late = await post(h, '/api/auth/confirm', { token: mine ?? '' });
    expect(late.statusCode).toBe(409);
    expect(late.json<{ error: string }>().error).toMatch(/took this name in the meantime/);
    // Once the name has an account, a new registration with it is refused at once.
    const taken = await post(h, '/api/auth/register', { ...ADA, email: 'third@example.org' });
    expect(taken.json()).toEqual({ error: 'This name is already taken.' });
  });

  it('refuses the link when the account store loses the race, and leaves no account', async () => {
    const box = mailbox();
    const credentials = { ...memoryCredentials(), create: () => Promise.resolve(false) };
    const h = await startHarness(false, {}, { mailer: box, credentials });
    harness = h;
    await post(h, '/api/auth/register', ADA);
    await expect.poll(() => tokensIn(box).length).toBe(1);
    const answer = await post(h, '/api/auth/confirm', { token: tokensIn(box)[0] ?? '' });
    expect(answer.statusCode).toBe(409);
    expect((await signIn(h, 'ada')).statusCode).toBe(401);
  });
});

describe('the neutral registration (D36)', () => {
  it('answers a new and a taken e-mail alike, without a session, and says the rest by mail', async () => {
    const { h, box } = await started();
    expect(await h.register(ADA)).toBe(200);
    const timed = async (payload: object) => {
      const begun = Date.now();
      const answer = await post(h, '/api/auth/register', payload);
      return { answer, ms: Date.now() - begun };
    };
    const fresh = await timed({ ...ADA, name: 'Bea', email: 'bea@example.org' });
    const taken = await timed({ ...ADA, name: 'Bob', email: 'ADA@example.org' });
    for (const { answer, ms } of [fresh, taken]) {
      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toEqual({ ok: true });
      expect(answer.headers['set-cookie']).toBeUndefined();
      expect(ms).toBeGreaterThanOrEqual(REGISTER_MIN_MS - 5);
    }
    await expect.poll(() => box.sent.length).toBe(3);
    expect(box.sent[1]?.text).toMatch(/Confirm it here to make the account/);
    expect(box.sent[2]?.text).toMatch(/There already is an account/);
    // The taken e-mail made nothing to confirm: Bob has no link and cannot sign in.
    expect(tokensIn(box)).toHaveLength(2);
    expect((await signIn(h, 'bob')).statusCode).toBe(401);
  });

  it('says so when no mail is set up: no link could reach anyone', async () => {
    harness = await startHarness(false, {}, { mailer: null });
    expect((await post(harness, '/api/auth/register', ADA)).statusCode).toBe(503);
  });

  it('refuses a name outside the rule, before any work', async () => {
    harness = await startHarness(false);
    for (const name of ['Олга', 'ana.lee', 'Ｏｌｇａ', '---']) {
      const answer = await post(harness, '/api/auth/register', { ...ADA, name });
      expect(answer.statusCode).toBe(400);
      expect(answer.json<{ error: string }>().error).toMatch(/3 to 32 Latin letters/);
    }
  });

  it('sends one address 3 mails an hour at most, with the same answer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { h, box } = await started();
    for (const name of ['Ada', 'Bea', 'Cid', 'Dov']) {
      const answer = await post(h, '/api/auth/register', { ...ADA, name });
      expect(answer.json()).toEqual({ ok: true });
      // Past the minute between two mails of one registration.
      vi.setSystemTime(Date.now() + MINUTE + 1);
    }
    // Let a fourth mail have its chance to arrive before counting.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(box.sent).toHaveLength(3);
  });
});
