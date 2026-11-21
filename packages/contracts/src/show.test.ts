/**
 * @file   packages/contracts/src/show.test.ts
 * @brief  Tests the shared vocabulary: the show states, the moderating roles, the prize label.
 */
import { describe, expect, it } from 'vitest';

import { prizeLabel, prizeTitle } from './artifact.js';
import { canModerate, RankSchema, SHOW_STATES, ShowStateSchema } from './show.js';

describe('ShowStateSchema', () => {
  it('lists the five states of a show in their order', () => {
    expect(SHOW_STATES).toEqual(['setup', 'registration', 'sealed', 'live', 'ended']);
  });

  it('refuses a state the concept does not know', () => {
    expect(ShowStateSchema.safeParse('paused').success).toBe(false);
    expect(ShowStateSchema.parse('live')).toBe('live');
  });
});

describe('roles and ranks', () => {
  it('lets moderators and admins lead, nobody else', () => {
    expect((['viewer', 'player', 'moderator', 'admin'] as const).map(canModerate)).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  it('keeps the prototype ranks within 0–5', () => {
    expect(RankSchema.safeParse(5).success).toBe(true);
    expect(RankSchema.safeParse(6).success).toBe(false);
  });
});

describe('prizeLabel', () => {
  it('shows an empty label as "Prize <slot>" (CONCEPT §3.1)', () => {
    expect(prizeLabel({ slot: 2, label: '  ' })).toBe('Prize 2');
    expect(prizeLabel({ slot: 1, label: 'Gold' })).toBe('Gold');
  });

  it('titles a slot without repeating "Prize n"', () => {
    expect(prizeTitle({ slot: 2, label: '' })).toBe('Prize 2');
    expect(prizeTitle({ slot: 1, label: ' Gold ' })).toBe('Prize 1: Gold');
  });
});
