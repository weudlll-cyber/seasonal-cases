/**
 * @file   packages/domain/src/redact.test.ts
 * @brief  Tests taking a player's name out of the events (D61): every place an event names a
 *         person is covered, other people's events are the same objects, and the show folded from
 *         the redacted events is the same show but for the name: same cases, same sealing, and a
 *         commitment that still verifies.
 */
import { describe, expect, it } from 'vitest';

import { foldShow } from './model.js';
import { redactPlayer } from './redact.js';
import { seededRandom } from './random.js';
import { verify } from './sealing.js';
import { clock, MOD, newShow } from './testing/fixtures.js';

const at = clock();
const ANA = { id: 'ana', name: 'Ana Example' };
const NOAH = { id: 'noah', name: 'Noah' };
const GONE = 'deleted player ana';

/** A finished show: Ana and Noah claim, Ana is also the one the direction is handed to. */
function finished() {
  const show = newShow(4, 2, ['Gold']);
  show.run({ type: 'openRegistration', at: at(), by: MOD.id });
  show.run({ type: 'claim', at: at(), player: ANA, rank: 2, caseNumber: 1 });
  show.run({ type: 'claim', at: at(), player: NOAH, rank: 1, caseNumber: 2 });
  show.run({ type: 'closeRegistration', at: at(), by: MOD.id });
  show.run({ type: 'seal', at: at(), by: MOD.id, random: seededRandom('redact') });
  show.run({ type: 'start', at: at(), by: MOD });
  show.run({ type: 'begin', at: at(), by: MOD.id });
  show.run({ type: 'handOver', at: at(), by: MOD.id, to: ANA });
  return show;
}

describe('redactPlayer', () => {
  it('replaces the name of the actor with the id wherever an event has one', () => {
    const own = { ...MOD, id: ANA.id, name: ANA.name };
    const first = newShow(2, 1).events[0];
    if (first === undefined) throw new Error('no created event');
    const created = redactPlayer(first, MOD.id, GONE);
    expect(created.type === 'created' && created.by).toEqual({ id: MOD.id, name: GONE });
    const claimed = redactPlayer(
      { type: 'claimed', at: 't', player: ANA, rank: 2, caseNumber: 1 },
      ANA.id,
      GONE,
    );
    expect(claimed.type === 'claimed' && claimed.player).toEqual({ id: ANA.id, name: GONE });
    const started = redactPlayer({ type: 'started', at: 't', by: own }, ANA.id, GONE);
    expect(started.type === 'started' && started.by.name).toBe(GONE);
    const handed = redactPlayer(
      { type: 'handedOver', at: 't', by: 'mod-1', to: ANA },
      ANA.id,
      GONE,
    );
    expect(handed.type === 'handedOver' && handed.to.name).toBe(GONE);
  });

  it('gives back the same object where nothing changes', () => {
    const claimed = { type: 'claimed', at: 't', player: NOAH, rank: 1, caseNumber: 2 } as const;
    expect(redactPlayer(claimed, ANA.id, GONE)).toBe(claimed);
    const ended = { type: 'ended', at: 't', by: 'mod-1' } as const;
    expect(redactPlayer(ended, ANA.id, GONE)).toBe(ended);
    const already = {
      type: 'claimed',
      at: 't',
      player: { id: ANA.id, name: GONE },
      rank: 2,
      caseNumber: 1,
    } as const;
    expect(redactPlayer(already, ANA.id, GONE)).toBe(already);
  });

  it('leaves no trace of the name in the log, and the show is the same but for it', () => {
    const show = finished();
    const redacted = show.events.map((e) => redactPlayer(e, ANA.id, GONE));
    expect(JSON.stringify(show.events)).toContain('Ana Example');
    expect(JSON.stringify(redacted)).not.toContain('Ana Example');
    expect(JSON.stringify(redacted)).toContain(GONE);
    const before = show.model();
    const after = foldShow(redacted);
    expect(after.claims.find((c) => c.player.id === ANA.id)?.player.name).toBe(GONE);
    expect(after.claims.map((c) => [c.caseNumber, c.rank])).toEqual(
      before.claims.map((c) => [c.caseNumber, c.rank]),
    );
    // The sealed distribution and the commitment are untouched, and the commitment verifies.
    expect(after.sealing).toEqual(before.sealing);
    const { sealing } = after;
    expect(sealing).not.toBeNull();
    if (sealing !== null) {
      expect(verify(sealing.assignment, sealing.secret, sealing.commitment)).toBe(true);
    }
  });
});
