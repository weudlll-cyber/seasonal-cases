/**
 * @file   apps/server/src/auth/failureBrake.test.ts
 * @brief  Tests the failure brake (D51): it looks without counting, counts failures only, lets a
 *         key go as its oldest failure leaves the window, and holds a bounded number of keys;
 *         and sign-in's three keys over it (D55).
 */
import { describe, expect, it } from 'vitest';

import { FailureBrake, SIGN_IN_BRAKE, SignInBrake } from './failureBrake.js';

const WINDOW = 15 * 60_000;

function clocked(limit = 3, maxKeys = 100) {
  let now = 1_000_000;
  const brake = new FailureBrake({ limit, windowMs: WINDOW }, () => now, maxKeys);
  return {
    brake,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('the failure brake', () => {
  it('looks without counting: asking never brakes a key', () => {
    const { brake } = clocked();
    for (let i = 0; i < 10; i += 1) expect(brake.braked('a')).toBe(false);
  });

  it('brakes a key once it has `limit` failures in the window, and only that key', () => {
    const { brake } = clocked();
    brake.failed('a');
    brake.failed('a');
    expect(brake.braked('a')).toBe(false);
    brake.failed('a');
    expect(brake.braked('a')).toBe(true);
    expect(brake.braked('b')).toBe(false);
  });

  it('lets the key go as its oldest failure leaves the window', () => {
    const { brake, advance } = clocked();
    brake.failed('a');
    advance(5 * 60_000);
    brake.failed('a');
    brake.failed('a');
    expect(brake.braked('a')).toBe(true);
    advance(10 * 60_000);
    expect(brake.braked('a')).toBe(false);
    brake.failed('a');
    expect(brake.braked('a')).toBe(true);
  });

  it('forgets keys without failures in the window, and holds at most maxKeys', () => {
    const { brake, advance } = clocked(3, 2);
    brake.failed('a');
    advance(WINDOW);
    expect(brake.braked('a')).toBe(false);
    expect(brake.size).toBe(0);
    brake.failed('b');
    brake.failed('c');
    brake.failed('d');
    expect(brake.size).toBe(2);
  });
});

describe('sign-in’s brake (D55)', () => {
  it('holds the owner’s numbers: 20 per pair, 100 per account, 20 per address, 15 minutes', () => {
    expect(SIGN_IN_BRAKE).toEqual({ pair: 20, account: 100, address: 20, windowMs: WINDOW });
  });

  it('brakes the pair at 20, the account everywhere at 100, the address at 20', () => {
    const brake = new SignInBrake(() => 0);
    for (let i = 0; i < 20; i += 1) brake.failed('x', 'a');
    expect(brake.accountBraked('x', 'a')).toBe(true);
    expect(brake.accountBraked('x', 'b')).toBe(false);
    expect(brake.addressBraked('a')).toBe(true);
    expect(brake.addressBraked('b')).toBe(false);
    for (let i = 0; i < 80; i += 1) brake.failed('x', `c${String(i % 10)}`);
    expect(brake.accountBraked('x', 'b')).toBe(true);
    expect(brake.accountBraked('y', 'b')).toBe(false);
  });
});
