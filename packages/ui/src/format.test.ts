/**
 * @file   packages/ui/src/format.test.ts
 * @brief  Tests the shortened commitment and the time format.
 */
import { describe, expect, it } from 'vitest';

import { counted, formatTime, shortCommitment } from './format.js';

describe('shortCommitment', () => {
  it('keeps the first 12 hex digits of a sha256', () => {
    const hex = 'ab'.repeat(32);
    expect(shortCommitment(hex)).toBe('abababababab');
  });
});

describe('formatTime', () => {
  it('shows day, month, year and the time to the second', () => {
    expect(formatTime('2026-11-21T20:04:09.000Z')).toMatch(/^\d{1,2} Nov 2026, \d{2}:04:09$/);
  });
});

describe('counted', () => {
  it('says one thing without the plural', () => {
    expect([0, 1, 2].map((n) => counted(n, 'prize'))).toEqual(['0 prizes', '1 prize', '2 prizes']);
  });
});
