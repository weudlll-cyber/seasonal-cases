/**
 * @file   packages/domain/src/projection.test.ts
 * @brief  Tests the views: nothing unopened ever leaks, found prizes and the top bar, the
 *         moderator view without contents, the personal standing, and the verified result.
 */
import { describe, expect, it } from 'vitest';

import type { ShowEvent } from './events.js';
import { applyEvent, foldShow, type ShowModel } from './model.js';
import { moderatorView, personalView, publicView, showResult } from './projection.js';
import { seededRandom } from './random.js';
import { clock, MOD, MOD2, newShow, type Driver } from './testing/fixtures.js';

const at = clock();
const STEPS = ['open', 'owner', 'return'] as const;

function sealedShow(): Driver {
  const show = newShow(12, 3, ['Gold', '', 'Bronze']);
  show.run({ type: 'openRegistration', at: at(), by: MOD.id });
  show.run({ type: 'claim', at: at(), player: { id: 'ana', name: 'Ana' }, rank: 3, caseNumber: 7 });
  show.run({ type: 'fillWithBots', at: at(), random: seededRandom('bots') });
  show.run({ type: 'closeRegistration', at: at(), by: MOD.id });
  show.run({ type: 'seal', at: at(), by: MOD.id, random: seededRandom('sc-n1-01') });
  show.run({ type: 'start', at: at(), by: MOD });
  show.run({ type: 'begin', at: at(), by: MOD.id });
  return show;
}

const caseOf = (m: ShowModel, id: string): number =>
  m.sealing?.assignment.find((e) => e.artifactId === id)?.caseNumber ?? 0;

/** Opens the main prize, one blank and the third prize, then ends: the whole show's events. */
function playedShow(): Driver {
  const show = sealedShow();
  const m = show.model();
  for (const n of [caseOf(m, 'prize-1'), caseOf(m, 'blank-1'), caseOf(m, 'prize-3')]) {
    show.run({ type: 'select', at: at(), by: MOD.id, caseNumber: n });
    for (const step of STEPS) show.run({ type: 'step', at: at(), by: MOD.id, step });
  }
  show.run({ type: 'end', at: at(), by: MOD.id });
  return show;
}

describe('the public and moderator views never leak (CONCEPT §8)', () => {
  it('hold no unopened content, assignment or secret at any point before the end', () => {
    const { events } = playedShow();
    const [first, ...rest] = events;
    if (first === undefined) throw new Error('no events');
    let model = foldShow([first]);
    const states: ShowModel[] = [model];
    for (const e of rest) states.push((model = applyEvent(model, e)));
    const secret = model.sealing?.secret ?? 'missing';
    for (const m of states.filter((s) => s.state !== 'ended')) {
      for (const view of [publicView(m), moderatorView(m, [MOD, MOD2]).show]) {
        const text = JSON.stringify(view);
        expect(text).not.toContain(secret);
        expect(text).not.toContain('assignment');
        for (const c of view.cases) {
          if (!m.opened.includes(c.number)) expect(c.artifact).toBeNull();
        }
      }
      expect(JSON.stringify(moderatorView(m, [MOD]))).not.toContain(secret);
    }
  });
});

describe('found prizes', () => {
  it('shows a prize from its "Open" step on, its case keeping its owner', () => {
    const show = sealedShow();
    const main = caseOf(show.model(), 'prize-1');
    show.run({ type: 'select', at: at(), by: MOD.id, caseNumber: main });
    let view = publicView(show.model());
    expect(view.cases[main - 1]?.artifact).toBeNull();
    show.run({ type: 'step', at: at(), by: MOD.id, step: 'open' });
    view = publicView(show.model());
    expect(view.cases[main - 1]?.artifact?.name).toBe('Halving Stone');
    expect(view.cases[main - 1]?.ownerName).not.toBeNull();
    expect(view.allPrizesFound).toBe(false);
  });

  it('flags "all prizes found" once the W prizes are open, and the stage shows the owners', () => {
    const show = sealedShow();
    for (const id of ['prize-1', 'prize-2', 'prize-3']) {
      show.run({ type: 'select', at: at(), by: MOD.id, caseNumber: caseOf(show.model(), id) });
      for (const step of STEPS) show.run({ type: 'step', at: at(), by: MOD.id, step });
    }
    const view = publicView(show.model());
    expect(view.allPrizesFound).toBe(true);
    expect(view.cases[6]).toMatchObject({ ownerName: 'Ana', ownerRank: 3 });
    expect(view.board).toBeNull();
    expect(view.commitment).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('moderator and personal views', () => {
  it('adds the holder and the moderators to hand over to', () => {
    const show = sealedShow();
    const view = moderatorView(show.model(), [MOD, MOD2]);
    expect(view.holder).toEqual(MOD);
    expect(view.moderators).toEqual([MOD, MOD2]);
  });

  it('tells a player their claim, whether it holds and their standing per case', () => {
    const show = newShow(3, 1);
    show.run({ type: 'openRegistration', at: at(), by: MOD.id });
    show.run({ type: 'claim', at: at(), player: { id: 'hi', name: 'Hi' }, rank: 5, caseNumber: 1 });
    show.run({ type: 'claim', at: at(), player: { id: 'lo', name: 'Lo' }, rank: 1, caseNumber: 1 });
    const lo = personalView(show.model(), { id: 'lo', rank: 1 });
    expect(lo).toMatchObject({ claim: 1, holds: false });
    expect(lo.standings.map((s) => s.standing)).toEqual(['lower', 'free', 'free']);
    expect(publicView(show.model()).board?.[0]?.others.map((o) => o.name)).toEqual(['Lo']);
    show.run({ type: 'claim', at: at(), player: { id: 'lo', name: 'Lo' }, rank: 1, caseNumber: 2 });
    show.run({ type: 'closeRegistration', at: at(), by: MOD.id });
    expect(personalView(show.model(), { id: 'lo', rank: 1 })).toMatchObject({
      claim: 2,
      holds: true,
      standings: [],
    });
    expect(personalView(show.model(), { id: 'nobody', rank: 0 }).holds).toBe(false);
  });
});

describe('the result', () => {
  it('lists the winners, then all cases, reveals the secret and verifies', () => {
    const show = playedShow();
    expect(showResult(sealedShow().model())).toBeNull();
    const result = showResult(show.model());
    if (result === null) throw new Error('no result');
    expect(result.winners.map((w) => w.artifact.name)).toEqual([
      'Halving Stone',
      'Season Key',
      'Winter Crystal',
    ]);
    expect(result.cases).toHaveLength(12);
    expect(result.cases.filter((c) => c.artifact.prizeSlot === null)).toHaveLength(9);
    expect(result.secret).toBe(show.model().sealing?.secret);
    expect(result.verified).toBe(true);
    expect(publicView(show.model()).result).toEqual(result);
  });

  it('fails verification when one case of the logged assignment is altered after sealing', () => {
    const { events } = playedShow();
    // Move the main prize to another case in the log, as a tampering server would.
    const tampered = events.map((e): ShowEvent => {
      if (e.type !== 'sealed') return e;
      const assignment = e.assignment.map((entry) =>
        entry.caseNumber === 1
          ? { caseNumber: 1, artifactId: entry.artifactId === 'prize-1' ? 'blank-1' : 'prize-1' }
          : entry,
      );
      return { ...e, assignment };
    });
    expect(showResult(foldShow(tampered))?.verified).toBe(false);
  });
});
