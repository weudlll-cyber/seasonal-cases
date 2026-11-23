/**
 * @file   packages/domain/src/random.test.ts
 * @brief  Tests the seeded generator: reproducible, seed-dependent, in range, roughly uniform.
 */
import { describe, expect, it } from 'vitest';

import { seededRandom } from './random.js';

describe('seededRandom', () => {
  it('gives the same stream for the same seed and another for another seed', () => {
    const draw = (seed: string) => {
      const r = seededRandom(seed);
      return Array.from({ length: 20 }, () => r.int(1000));
    };
    expect(draw('sc-n1-01')).toEqual(draw('sc-n1-01'));
    expect(draw('sc-n1-01')).not.toEqual(draw('sc-n1-02'));
  });

  it('stays inside [0, max) and reaches every value of a small range evenly', () => {
    const r = seededRandom('uniform');
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6000; i += 1) {
      const v = r.int(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    // 1000 expected each; ±15 % is far outside chance for a uniform source.
    for (const c of counts) expect(Math.abs(c - 1000)).toBeLessThan(150);
  });

  it('draws hex of the asked length and refuses an impossible range', () => {
    const r = seededRandom('hex');
    expect(r.hex(32)).toMatch(/^[0-9a-f]{64}$/);
    expect(() => r.int(0)).toThrow(RangeError);
    expect(() => r.int(1.5)).toThrow(RangeError);
    expect(r.int(1)).toBe(0);
  });
});
