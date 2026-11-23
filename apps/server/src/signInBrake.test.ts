/**
 * @file   apps/server/src/signInBrake.test.ts
 * @brief  Tests sign-in's two limits (DECISIONS D45, D48): the brake against guessing, 20 tries
 *         per 15 minutes per address, and the cap of 20 a minute per address behind it; the
 *         brake answers before the cap counts.
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
const CAP_TEXT = 'too many requests from your network, wait a minute';

/** `count` sign-ins with wrong passwords, each with its own login; their answers. */
async function tries(h: Harness, count: number, from = 0) {
  const answers: { code: number; error: string | undefined }[] = [];
  for (let i = from; i < from + count; i += 1) {
    const answer = await h.server.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in',
      payload: { login: `nobody${String(i)}`, password: 'whatever it is' },
    });
    answers.push({ code: answer.statusCode, error: answer.json<{ error?: string }>().error });
  }
  return answers;
}

describe('the brake against guessing (D48)', () => {
  it('refuses the 21st try from one address in 15 minutes, whatever the login', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const h = await startHarness();
    harness = h;
    const first = await tries(h, 21);
    expect(first.slice(0, 20).every((a) => a.code === 401)).toBe(true);
    expect(first[20]).toEqual({ code: 429, error: BRAKE_TEXT });
    // A minute refills the cap fully, the brake by one try only (it refills evenly over 15).
    vi.setSystemTime(Date.now() + 60_000);
    expect((await tries(h, 2, 21)).map((a) => a.code)).toEqual([401, 429]);
    // After its whole window the brake is full again.
    vi.setSystemTime(Date.now() + 15 * 60_000);
    expect((await tries(h, 1, 23))[0]?.code).toBe(401);
  });
});

describe('the order of brake and cap', () => {
  it('counts on the cap only the tries the brake let through', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    let counted = 0;
    const h = await startHarness(true, {}, { signInCap: () => (counted += 1) });
    harness = h;
    const answers = await tries(h, 25);
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
    const answers = await tries(h, 5);
    expect(answers.map((a) => a.code)).toEqual([401, 401, 401, 429, 429]);
    expect(answers[4]?.error).toBe(CAP_TEXT);
  });
});
