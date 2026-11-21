/**
 * @file   packages/domain/src/sealing.test.ts
 * @brief  Tests sealing: a full assignment, reproducible from a seed, and a commitment that
 *         verifies only the exact assignment and secret it was made over.
 */
import { describe, expect, it } from 'vitest';

import { seededRandom } from './random.js';
import { canonicalJson, commitmentOf, seal, verify } from './sealing.js';

describe('seal', () => {
  it('puts W prizes and N − W blanks into the N cases, each case exactly once', () => {
    const { assignment } = seal(12, 3, seededRandom('sc-n1-01'));
    expect(assignment.map((e) => e.caseNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const ids = assignment.map((e) => e.artifactId).sort();
    expect(ids.filter((id) => id.startsWith('prize-'))).toEqual(['prize-1', 'prize-2', 'prize-3']);
    expect(new Set(ids).size).toBe(12);
  });

  it('is reproducible from the seed and differs for another seed', () => {
    const a = seal(24, 3, seededRandom('seed-a'));
    expect(seal(24, 3, seededRandom('seed-a'))).toEqual(a);
    expect(seal(24, 3, seededRandom('seed-b')).assignment).not.toEqual(a.assignment);
  });

  it('commits to the assignment and a 32-byte secret with sha256', () => {
    const { assignment, secret, commitment } = seal(5, 2, seededRandom('c'));
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    expect(commitment).toMatch(/^[0-9a-f]{64}$/);
    expect(verify(assignment, secret, commitment)).toBe(true);
  });
});

describe('verify', () => {
  const { assignment, secret, commitment } = seal(6, 2, seededRandom('verify'));

  it('fails when one case of the assignment is altered after sealing', () => {
    const [first, second, ...rest] = assignment;
    if (first === undefined || second === undefined) throw new Error('too few cases');
    // Swap the contents of cases 1 and 2: same artifacts, different cases.
    const altered = [
      { caseNumber: 1, artifactId: second.artifactId },
      { caseNumber: 2, artifactId: first.artifactId },
      ...rest,
    ];
    expect(verify(altered, secret, commitment)).toBe(false);
  });

  it('fails with another secret, and does not depend on the entries’ order', () => {
    expect(verify(assignment, 'f'.repeat(64), commitment)).toBe(false);
    expect(verify([...assignment].reverse(), secret, commitment)).toBe(true);
  });

  it('hashes a canonical text with fixed keys and no whitespace', () => {
    const text = canonicalJson(
      [
        { caseNumber: 2, artifactId: 'blank-1' },
        { caseNumber: 1, artifactId: 'prize-1' },
      ],
      'ab',
    );
    expect(text).toBe('{"assignment":[[1,"prize-1"],[2,"blank-1"]],"secret":"ab"}');
    expect(commitmentOf([], 'x')).toHaveLength(64);
  });
});
