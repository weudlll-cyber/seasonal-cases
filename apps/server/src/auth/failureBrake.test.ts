/**
 * @file   apps/server/src/auth/failureBrake.test.ts
 * @brief  Tests the failure brake (D51): it looks without counting, counts failures only, lets a
 *         key go as its oldest failure leaves the window, and holds a bounded number of keys.
 */
import { describe, expect, it } from 'vitest';

import { FailureBrake } from './failureBrake.js';

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
