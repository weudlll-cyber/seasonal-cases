/**
 * @file   packages/domain/src/setup.test.ts
 * @brief  Tests the setup limits, the prize slots and the artifact table from the settings.
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from './settings.js';
import { artifactTable, prizeSlots, setupProblem } from './setup.js';

describe('setupProblem', () => {
  it('accepts the edges of the limits', () => {
    expect(setupProblem({ cases: 2, winners: 1 })).toBeNull();
    expect(setupProblem({ cases: 99, winners: 99, labels: ['a'] })).toBeNull();
  });

  it('refuses too few or too many cases and fractions', () => {
    expect(setupProblem({ cases: 1, winners: 1 })).toMatch(/cases/);
    expect(setupProblem({ cases: 100, winners: 1 })).toMatch(/cases/);
    expect(setupProblem({ cases: 2.5, winners: 1 })).toMatch(/cases/);
  });

  it('refuses no winners, more winners than cases, and more labels than winners', () => {
    expect(setupProblem({ cases: 5, winners: 0 })).toMatch(/winners/);
    expect(setupProblem({ cases: 5, winners: 6 })).toMatch(/winners/);
    expect(setupProblem({ cases: 5, winners: 1.5 })).toMatch(/winners/);
    expect(setupProblem({ cases: 5, winners: 1, labels: ['a', 'b'] })).toMatch(/labels/);
  });
});

describe('prizeSlots', () => {
  it('numbers the slots from 1 and keeps empty labels empty', () => {
    expect(prizeSlots(3, [' Gold ', ''])).toEqual([
      { slot: 1, label: 'Gold' },
      { slot: 2, label: '' },
      { slot: 3, label: '' },
    ]);
  });
});

describe('artifactTable', () => {
  it('follows the order of the settings, then relics, with the blank apart (CONCEPT §6)', () => {
    const { prizes, blank } = artifactTable(DEFAULT_SETTINGS, 8, 'winter');
    expect(prizes.map((p) => p.name)).toEqual([
      'Halving Stone',
      'Season Key',
      'Winter Crystal',
      'Spring Seed',
      'Summer Flame',
      'Ancient Leaf',
      'Relic #7',
      'Relic #8',
    ]);
    expect(prizes.map((p) => p.season)).toEqual([
      'all',
      'autumn',
      'winter',
      'spring',
      'summer',
      'autumn',
      'winter',
      'winter',
    ]);
    expect(prizes.map((p) => p.prizeSlot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(blank).toEqual({ id: 'blank', name: 'Fallen Leaf', season: 'winter', prizeSlot: null });
  });

  it('takes names from the settings, not from the code', () => {
    const settings = {
      prizeArtifacts: [{ name: 'Moon', season: 'current' as const }],
      relicName: 'Shard {n}',
      blankName: 'Dust',
    };
    const { prizes, blank } = artifactTable(settings, 2, 'spring');
    expect(prizes.map((p) => [p.name, p.season])).toEqual([
      ['Moon', 'spring'],
      ['Shard 2', 'spring'],
    ]);
    expect(blank.name).toBe('Dust');
  });
});
