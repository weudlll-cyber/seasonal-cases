/**
 * @file   packages/contracts/src/show.test.ts
 * @brief  Tests the shared vocabulary: the show states, the directing roles, the prize label.
 */
import { describe, expect, it } from 'vitest';

import { prizeName, prizeTitle } from './artifact.js';
import { canDirect, RankSchema, SHOW_STATES, ShowStateSchema } from './show.js';

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
  it('lets organisers and admins lead, nobody else', () => {
    expect((['viewer', 'player', 'organiser', 'admin'] as const).map(canDirect)).toEqual([
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

describe('prizeName', () => {
  it('names the slot once and the label only when there is one (CONCEPT §3.1)', () => {
    expect(prizeName(2, '  ')).toBe('Prize 2');
    expect(prizeName(2, 'Prize 2')).toBe('Prize 2');
    expect(prizeName(1, ' Gold ')).toBe('Prize 1 · Gold');
    expect(prizeTitle({ slot: 3, label: 'Poster' })).toBe('Prize 3 · Poster');
  });
});
