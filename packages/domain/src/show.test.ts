/**
 * @file   packages/domain/src/show.test.ts
 * @brief  Tests a show's life through `decide` and the fold: setup, registration, sealing, the
 *         three steps under one direction holder, hand-over, the end and replay.
 */
import { describe, expect, it } from 'vitest';

import { decideCreate } from './commands.js';
import type { ShowEvent } from './events.js';
import { foldShow } from './model.js';
import { seededRandom } from './random.js';
import { DEFAULT_SETTINGS } from './settings.js';
import { clock, MOD, MOD2, newShow, type Driver } from './testing/fixtures.js';

const at = clock();

/** A live show of 12 cases and 3 winners, every case owned, MOD holding the direction. */
function liveShow(): Driver {
  const show = newShow(12, 3, ['Gold']);
  show.run({ type: 'openRegistration', at: at(), by: MOD.id });
  show.run({ type: 'claim', at: at(), player: { id: 'ana', name: 'Ana' }, rank: 3, caseNumber: 7 });
  show.run({ type: 'fillWithBots', at: at(), random: seededRandom('bots') });
  show.run({ type: 'closeRegistration', at: at(), by: MOD.id });
  show.run({ type: 'seal', at: at(), by: MOD.id, random: seededRandom('sc-n1-01') });
  show.run({ type: 'start', at: at(), by: MOD });
  show.run({ type: 'begin', at: at(), by: MOD.id });
  return show;
}

/** The case holding a given artifact id (the test may read the sealing; clients never do). */
function caseWith(show: Driver, prefix: string): number {
  const entry = show.model().sealing?.assignment.find((e) => e.artifactId.startsWith(prefix));
  if (entry === undefined) throw new Error(`no ${prefix} sealed`);
  return entry.caseNumber;
}

function reveal(show: Driver, caseNumber: number, by = MOD.id): void {
  show.run({ type: 'select', at: at(), by, caseNumber });
  for (const step of ['open', 'owner', 'return'] as const) {
    show.run({ type: 'step', at: at(), by, step });
  }
}

describe('setup and registration', () => {
  it('refuses an invalid setup', () => {
    const d = decideCreate({
      type: 'create',
      at: at(),
      showId: 's',
      by: MOD,
      cases: 1,
      winners: 1,
      labels: [],
      season: 'autumn',
      settings: DEFAULT_SETTINGS,
    });
    expect(d).toEqual({ ok: false, error: expect.stringMatching(/cases/) as unknown });
  });

  it('opens once, takes claims only while open, and seals only after the close', () => {
    const show = newShow(4, 1);
    const ana = { id: 'ana', name: 'Ana' };
    expect(show.refused({ type: 'claim', at: at(), player: ana, rank: 1, caseNumber: 1 })).toMatch(
      /not open/,
    );
    expect(show.refused({ type: 'closeRegistration', at: at(), by: MOD.id })).toMatch(/not open/);
    show.run({ type: 'openRegistration', at: at(), by: MOD.id });
    expect(show.model().state).toBe('registration');
    expect(show.refused({ type: 'openRegistration', at: at(), by: MOD.id })).toMatch(/once/);
    expect(show.refused({ type: 'claim', at: at(), player: ana, rank: 1, caseNumber: 5 })).toMatch(
      /no such/,
    );
    expect(show.refused({ type: 'seal', at: at(), by: MOD.id, random: seededRandom('x') })).toMatch(
      /closed/,
    );
    show.run({ type: 'claim', at: at(), player: ana, rank: 1, caseNumber: 2 });
    show.run({ type: 'closeRegistration', at: at(), by: MOD.id });
    expect(show.refused({ type: 'fillWithBots', at: at(), random: seededRandom('x') })).toMatch(
      /not open/,
    );
    expect(show.model().owners?.map((o) => o?.player.id ?? null)).toEqual([
      null,
      'ana',
      null,
      null,
    ]);
    expect(show.refused({ type: 'start', at: at(), by: MOD })).toMatch(/sealed/);
    show.run({ type: 'seal', at: at(), by: MOD.id, random: seededRandom('x') });
    expect(show.model().state).toBe('sealed');
  });
});

describe('the opening', () => {
  it('holds back every selection until the holder begins, once', () => {
    const show = newShow(4, 1);
    show.run({ type: 'openRegistration', at: at(), by: MOD.id });
    show.run({ type: 'fillWithBots', at: at(), random: seededRandom('b') });
    show.run({ type: 'closeRegistration', at: at(), by: MOD.id });
    show.run({ type: 'seal', at: at(), by: MOD.id, random: seededRandom('s') });
    show.run({ type: 'start', at: at(), by: MOD });
    expect(show.model().begun).toBe(false);
    expect(show.refused({ type: 'select', at: at(), by: MOD.id, caseNumber: 1 })).toMatch(/begin/);
    expect(show.refused({ type: 'begin', at: at(), by: MOD2.id })).toMatch(/holder/);
    show.run({ type: 'begin', at: at(), by: MOD.id });
    expect(show.refused({ type: 'begin', at: at(), by: MOD.id })).toMatch(/already/);
    show.run({ type: 'select', at: at(), by: MOD.id, caseNumber: 1 });
    expect(show.model()).toMatchObject({ begun: true, selected: 1 });
  });
});

describe('live: the direction holder and the three steps', () => {
  it('lets only the holder act, and only while live', () => {
    const show = liveShow();
    expect(show.model().holder).toEqual(MOD);
    expect(show.refused({ type: 'select', at: at(), by: MOD2.id, caseNumber: 1 })).toMatch(
      /holder/,
    );
    expect(show.refused({ type: 'end', at: at(), by: 'ana' })).toMatch(/holder/);
    const sealed = newShow(2, 1);
    expect(sealed.refused({ type: 'step', at: at(), by: MOD.id, step: 'open' })).toMatch(
      /not live/,
    );
  });

  it('walks select → open → owner → return in order only', () => {
    const show = liveShow();
    expect(show.refused({ type: 'step', at: at(), by: MOD.id, step: 'open' })).toMatch(/after/);
    show.run({ type: 'select', at: at(), by: MOD.id, caseNumber: 1 });
    expect(show.refused({ type: 'step', at: at(), by: MOD.id, step: 'owner' })).toMatch(
      /after "open"/,
    );
    // Before "Open" the moderator may still change the case.
    show.run({ type: 'select', at: at(), by: MOD.id, caseNumber: 2 });
    expect(show.model()).toMatchObject({ selected: 2, step: 'selected', opened: [] });
    show.run({ type: 'step', at: at(), by: MOD.id, step: 'open' });
    expect(show.model().opened).toEqual([2]);
    expect(show.refused({ type: 'select', at: at(), by: MOD.id, caseNumber: 3 })).toMatch(/return/);
    for (const step of ['owner', 'return'] as const) {
      show.run({ type: 'step', at: at(), by: MOD.id, step });
    }
    expect(show.model()).toMatchObject({ selected: null, step: 'idle', opened: [2] });
    expect(show.refused({ type: 'select', at: at(), by: MOD.id, caseNumber: 2 })).toMatch(
      /already open/,
    );
    expect(show.refused({ type: 'select', at: at(), by: MOD.id, caseNumber: 13 })).toMatch(
      /no such/,
    );
  });

  it('folds a logged step the show no longer knows as a no-op', () => {
    const show = liveShow();
    show.run({ type: 'select', at: at(), by: MOD.id, caseNumber: 1 });
    const unknown = {
      type: 'stepped',
      at: at(),
      by: MOD.id,
      step: 'drumroll',
    } as unknown as ShowEvent;
    expect(foldShow([...show.events, unknown])).toEqual(show.model());
  });

  it('hands the direction over, and the new holder ends the show at any moment', () => {
    const show = liveShow();
    expect(show.refused({ type: 'handOver', at: at(), by: MOD.id, to: MOD })).toMatch(/already/);
    show.run({ type: 'handOver', at: at(), by: MOD.id, to: MOD2 });
    expect(show.refused({ type: 'select', at: at(), by: MOD.id, caseNumber: 1 })).toMatch(/holder/);
    show.run({ type: 'select', at: at(), by: MOD2.id, caseNumber: 1 });
    show.run({ type: 'end', at: at(), by: MOD2.id });
    expect(show.model().state).toBe('ended');
    expect(show.refused({ type: 'step', at: at(), by: MOD2.id, step: 'open' })).toMatch(/ended/);
  });

  it('rebuilds the same state from the event log', () => {
    const show = liveShow();
    reveal(show, caseWith(show, 'prize-1'));
    reveal(show, caseWith(show, 'blank-'));
    expect(foldShow(show.events)).toEqual(show.model());
    expect(() => foldShow(show.events.slice(1))).toThrow(/created/);
  });
});
