/**
 * @file   packages/ui/src/format.test.ts
 * @brief  Tests the shortened commitment: the first 12 hex digits, nothing else.
 */
import { describe, expect, it } from 'vitest';

import { shortCommitment } from './format.js';

describe('shortCommitment', () => {
  it('keeps the first 12 hex digits of a sha256', () => {
    const hex = 'ab'.repeat(32);
    expect(shortCommitment(hex)).toBe('abababababab');
  });
});
