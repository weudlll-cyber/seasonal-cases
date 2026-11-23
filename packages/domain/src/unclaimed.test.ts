/**
 * @file   packages/domain/src/unclaimed.test.ts
 * @brief  Tests a show with cases nobody claimed (DECISIONS D34): sealing fills every case, an
 *         unclaimed case goes through the three steps like any other, its prize is "not won"
 *         (no owner) in the view and the result, and "all prizes found" counts opened prize
 *         cases, won or not.
 */
import { describe, expect, it } from 'vitest';

import { publicView, showResult } from './projection.js';
import { seededRandom } from './random.js';
import { clock, MOD, newShow, type Driver } from './testing/fixtures.js';

const at = clock();
const ANA = { id: 'ana', name: 'Ana' };

/** Four cases, two prizes, Ana on case 1 only: cases 2–4 stay unclaimed. */
function liveWithUnclaimed(): Driver {
  const show = newShow(4, 2, ['Gold']);
  show.run({ type: 'openRegistration', at: at(), by: MOD.id });
  show.run({ type: 'claim', at: at(), player: ANA, rank: 2, caseNumber: 1 });
  show.run({ type: 'closeRegistration', at: at(), by: MOD.id });
  show.run({ type: 'seal', at: at(), by: MOD.id, random: seededRandom('unclaimed') });
  show.run({ type: 'start', at: at(), by: MOD });
  show.run({ type: 'begin', at: at(), by: MOD.id });
  return show;
}

/** The cases holding a prize, read from the sealing (tests may; clients never do). */
function prizeCases(show: Driver): number[] {
  const model = show.model();
  const prizeIds = new Set(model.prizes.filter((p) => p.prizeSlot !== null).map((p) => p.id));
  return (model.sealing?.assignment ?? [])
    .filter((e) => prizeIds.has(e.artifactId))
    .map((e) => e.caseNumber);
}

describe('unclaimed cases', () => {
  it('are sealed like any other: every case gets an artifact, only case 1 an owner', () => {
    const show = liveWithUnclaimed();
    expect(show.model().sealing?.assignment).toHaveLength(4);
    const view = publicView(show.model());
    expect(view.cases.map((c) => c.ownerName)).toEqual(['Ana', null, null, null]);
    expect(view.cases.map((c) => c.ownerId)).toEqual(['ana', null, null, null]);
  });

  it('open through the three steps with no owner at the owner step', () => {
    const show = liveWithUnclaimed();
    show.run({ type: 'select', at: at(), by: MOD.id, caseNumber: 3 });
    show.run({ type: 'step', at: at(), by: MOD.id, step: 'open' });
    show.run({ type: 'step', at: at(), by: MOD.id, step: 'owner' });
    const atOwner = publicView(show.model()).cases[2];
    expect(atOwner?.opened).toBe(true);
    expect(atOwner?.artifact).not.toBeNull();
    expect(atOwner?.ownerName).toBeNull();
    show.run({ type: 'step', at: at(), by: MOD.id, step: 'return' });
    expect(publicView(show.model()).live.step).toBe('idle');
  });

  it('count a prize in them as found but not won, everywhere', () => {
    const show = liveWithUnclaimed();
    for (const caseNumber of prizeCases(show)) {
      show.run({ type: 'select', at: at(), by: MOD.id, caseNumber });
      for (const step of ['open', 'owner', 'return'] as const) {
        show.run({ type: 'step', at: at(), by: MOD.id, step });
      }
    }
    // Found counts the opened prize cases, won or not.
    expect(publicView(show.model()).allPrizesFound).toBe(true);
    show.run({ type: 'end', at: at(), by: MOD.id });
    const result = showResult(show.model());
    expect(result?.winners).toHaveLength(2);
    for (const winner of result?.winners ?? []) {
      expect(winner.ownerName).toBe(winner.caseNumber === 1 ? 'Ana' : null);
    }
  });
});
