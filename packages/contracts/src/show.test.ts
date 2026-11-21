/**
 * @file   packages/contracts/src/show.test.ts
 * @brief  Tests the show-state schema: the five states of CONCEPT §3 in order, nothing else.
 */
import { describe, expect, it } from 'vitest';

import { SHOW_STATES, ShowStateSchema } from './show.js';

describe('ShowStateSchema', () => {
  it('lists the five states of a show in their order', () => {
    expect(SHOW_STATES).toEqual(['setup', 'registration', 'sealed', 'live', 'ended']);
  });

  it('refuses a state the concept does not know', () => {
    expect(ShowStateSchema.safeParse('paused').success).toBe(false);
    expect(ShowStateSchema.parse('live')).toBe('live');
  });
});
