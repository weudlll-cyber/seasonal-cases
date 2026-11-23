/**
 * @file   apps/server/src/signInBrake.test.ts
 * @brief  Tests sign-in's two limits (DECISIONS D45, D51): the brake against guessing counts
 *         failed sign-ins only, 20 per 15 minutes per address and per account; the cap of 20
 *         sign-ins a minute per address behind it; the brake answers before the cap counts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Refusal } from './http.js';
import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
  vi.useRealTimers();
});

const BRAKE_TEXT = 'too many tries, wait a few minutes';
// These tests check about 20 passwords each with the production argon2id (64 MiB, three passes):
// real work, which beside the other test files takes longer than the default 20 s.
const HASHES = { timeout: 90_000 };
const CAP_TEXT = 'too many requests from your network, wait a minute';
const PASSWORD = 'a long enough secret';
const ADA = { name: 'Ada', email: 'ada@example.org', password: PASSWORD };

/** One sign-in; its status and error sentence. */
async function signIn(h: Harness, login: string, password: string, remoteAddress = '127.0.0.1') {
  const answer = await h.server.app.inject({
    method: 'POST',
    url: '/api/auth/sign-in',
    payload: { login, password },
    remoteAddress,
  });
  return { code: answer.statusCode, error: answer.json<{ error?: string }>().error };
}

/** `count` wrong sign-ins from one address, each with its own unknown login. */
async function failures(h: Harness, count: number, from = 0) {
  const answers = [];
  for (let i = from; i < from + count; i += 1) {
    answers.push(await signIn(h, `nobody${String(i)}`, 'whatever it is'));
  }
  return answers;
}

describe('the brake against guessing counts failures only (D51)', () => {
  it('lets 21 successful sign-ins from one address pass within 15 minutes', HASHES, async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const h = await startHarness();
    harness = h;
    await h.register(ADA);
    const codes: number[] = [];
    for (let i = 0; i < 21; i += 1) {
      codes.push((await signIn(h, 'ada', PASSWORD)).code);
      // 40 s apart: 21 sign-ins in 14 minutes, each within the cap of 20 a minute.
      vi.setSystemTime(Date.now() + 40_000);
    }
    expect(codes.every((c) => c === 200)).toBe(true);
  });

  it(
    'brakes the 21st try from one address after 20 failures, whatever the login',
    HASHES,
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const h = await startHarness();
      harness = h;
      const first = await failures(h, 20);
      expect(first.every((a) => a.code === 401)).toBe(true);
      expect((await failures(h, 1, 20))[0]).toEqual({ code: 429, error: BRAKE_TEXT });
      // Once the oldest failure is 15 minutes old, the address may try again.
      vi.setSystemTime(Date.now() + 15 * 60_000);
      expect((await failures(h, 1, 21))[0]?.code).toBe(401);
    },
  );

  it(
    'brakes an account after 20 failures from any addresses, its right password too',
    HASHES,
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const h = await startHarness();
      harness = h;
      await h.register(ADA);
      // By name and by e-mail alike, each from an address of its own.
      for (let i = 0; i < 20; i += 1) {
        const login = i % 2 === 0 ? 'ada' : 'ADA@example.org';
        expect((await signIn(h, login, 'wrong', `10.0.${String(i)}.1`)).code).toBe(401);
      }
      expect(await signIn(h, 'ada', PASSWORD, '10.9.9.1')).toEqual({
        code: 429,
        error: BRAKE_TEXT,
      });
    },
  );

  it(
    'forgets nothing on a success: 19 failures, a success, one failure, then the brake',
    HASHES,
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const h = await startHarness();
      harness = h;
      await h.register(ADA);
      for (let i = 0; i < 19; i += 1) await signIn(h, 'ada', 'wrong', `10.1.${String(i)}.1`);
      expect((await signIn(h, 'ada', PASSWORD, '10.2.0.1')).code).toBe(200);
      expect((await signIn(h, 'ada', 'wrong', '10.2.0.2')).code).toBe(401);
      expect((await signIn(h, 'ada', PASSWORD, '10.2.0.3')).code).toBe(429);
    },
  );
});

describe('the order of brake and cap', () => {
  it('counts on the cap only the tries the brake let through', HASHES, async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    let counted = 0;
    const h = await startHarness(true, {}, { signInCap: () => (counted += 1) });
    harness = h;
    const answers = await failures(h, 25);
    expect(answers.filter((a) => a.code === 401)).toHaveLength(20);
    expect(answers.slice(20).every((a) => a.error === BRAKE_TEXT)).toBe(true);
    expect(counted).toBe(20);
  });

  it('answers with the cap once it is spent, before the password is checked', async () => {
    let counted = 0;
    const cap = () => {
      counted += 1;
      if (counted > 3) throw new Refusal(429, CAP_TEXT);
    };
    const h = await startHarness(true, {}, { signInCap: cap });
    harness = h;
    const answers = await failures(h, 5);
    expect(answers.map((a) => a.code)).toEqual([401, 401, 401, 429, 429]);
    expect(answers[4]?.error).toBe(CAP_TEXT);
  });
});
