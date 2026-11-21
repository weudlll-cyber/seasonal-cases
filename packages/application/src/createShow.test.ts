/**
 * @file   packages/application/src/createShow.test.ts
 * @brief  Tests that the setup check passes the domain's verdict through.
 */
import { describe, expect, it } from 'vitest';

import { checkSetup } from './createShow.js';

describe('checkSetup', () => {
  it('accepts a valid setup and names the reason for an invalid one', () => {
    expect(checkSetup({ cases: 24, winners: 3 })).toEqual({ ok: true });
    expect(checkSetup({ cases: 3, winners: 4 })).toEqual({
      ok: false,
      reason: expect.stringMatching(/winners/) as unknown,
    });
  });
});
