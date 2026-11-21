/**
 * @file   packages/domain/src/registration.test.ts
 * @brief  Tests the claims: rank priority, time order, replaced claims, the conflict view,
 *         the standings, the bots, and a fuzz against a brute-force reference.
 */
import { describe, expect, it } from 'vitest';

import { seededRandom } from './random.js';
import { board, botClaims, ownersAtClose, standings, type Claim } from './registration.js';
import { clock } from './testing/fixtures.js';

const at = clock();
let seq = 0;
function claim(id: string, rank: number, caseNumber: number, time = at()): Claim {
  return { at: time, player: { id, name: id }, rank, caseNumber, seq: seq++ };
}

describe('case resolution (DECISIONS D5)', () => {
  it('gives the case to the highest rank, even against an earlier claim', () => {
    const claims = [claim('early-low', 1, 7), claim('late-high', 4, 7)];
    expect(ownersAtClose(claims, 7)[6]?.player.id).toBe('late-high');
  });

  it('with equal rank gives it to the earlier claim, and with equal time to the first made', () => {
    expect(ownersAtClose([claim('first', 3, 1), claim('second', 3, 1)], 1)[0]?.player.id).toBe(
      'first',
    );
    const same = '2026-11-21T20:00:00.000Z';
    const tie = [claim('made-first', 2, 1, same), claim('made-second', 2, 1, same)];
    expect(ownersAtClose(tie, 1)[0]?.player.id).toBe('made-first');
  });

  it('lets a new claim replace the player’s earlier one', () => {
    const claims = [claim('ana', 2, 3), claim('ana', 2, 5)];
    const owners = ownersAtClose(claims, 5);
    expect(owners[2]).toBeNull();
    expect(owners[4]?.player.id).toBe('ana');
  });

  it('shows per case the holder and every other claimant with rank and time', () => {
    const claims = [claim('a', 1, 2), claim('b', 5, 2), claim('c', 1, 2)];
    const [first, second] = board(claims, 2);
    expect(first).toEqual({ number: 1, holder: null, others: [] });
    expect(second?.holder?.name).toBe('b');
    expect(second?.others.map((o) => [o.name, o.rank])).toEqual([
      ['a', 1],
      ['c', 1],
    ]);
    expect(second?.others[0]?.at).toMatch(/^2026-11-21T/);
  });
});

describe('standings', () => {
  it('says for every case whether the player would hold it if they picked it now', () => {
    const claims = [claim('me', 3, 1), claim('x', 2, 2), claim('y', 3, 3), claim('z', 4, 4)];
    expect(standings(claims, 5, { id: 'me', rank: 3 }).map((s) => s.standing)).toEqual([
      'yours',
      'higher',
      'equal',
      'lower',
      'free',
    ]);
  });
});

describe('botClaims', () => {
  it('claims every case nobody claimed, as bot-<case> with a rank from 0 to 5', () => {
    const events = botClaims([claim('ana', 1, 2)], 4, seededRandom('bots'), at());
    expect(events.map((e) => (e.type === 'claimed' ? e.caseNumber : 0))).toEqual([1, 3, 4]);
    for (const e of events) {
      if (e.type !== 'claimed') throw new Error('not a claim');
      expect(e.player).toEqual({
        id: `bot-${String(e.caseNumber)}`,
        name: `bot-${String(e.caseNumber)}`,
      });
      expect(e.rank).toBeGreaterThanOrEqual(0);
      expect(e.rank).toBeLessThanOrEqual(5);
    }
  });
});

// The reference: the rule written out as plainly as possible, without the code's helpers.
function beats(c: Claim, best: Claim | null): boolean {
  if (best === null || c.rank > best.rank) return true;
  if (c.rank < best.rank) return false;
  if (Date.parse(c.at) !== Date.parse(best.at)) return Date.parse(c.at) < Date.parse(best.at);
  return c.seq < best.seq;
}

function reference(claims: readonly Claim[], caseCount: number): (string | null)[] {
  const result: (string | null)[] = [];
  for (let n = 1; n <= caseCount; n += 1) {
    let best: Claim | null = null;
    for (const c of claims) {
      const later = claims.some((d) => d.player.id === c.player.id && d.seq > c.seq);
      if (!later && c.caseNumber === n && beats(c, best)) best = c;
    }
    result.push(best?.player.id ?? null);
  }
  return result;
}

describe('resolution fuzz', () => {
  it('agrees with the brute-force reference on 200 random claim sets', () => {
    const base = Date.UTC(2026, 10, 21, 20);
    for (let round = 0; round < 200; round += 1) {
      const cases = 2 + Math.floor(Math.random() * 10);
      const players = 1 + Math.floor(Math.random() * 12);
      const count = Math.floor(Math.random() * 40);
      const claims: Claim[] = Array.from({ length: count }, (_, i) => ({
        // Few distinct times, so equal times and equal ranks occur often.
        at: new Date(base + Math.floor(Math.random() * 5) * 1000).toISOString(),
        player: { id: `p${String(Math.floor(Math.random() * players))}`, name: 'p' },
        rank: Math.floor(Math.random() * 6),
        caseNumber: 1 + Math.floor(Math.random() * cases),
        seq: i,
      }));
      const owners = ownersAtClose(claims, cases).map((c) => c?.player.id ?? null);
      expect(owners).toEqual(reference(claims, cases));
    }
  });
});
