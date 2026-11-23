/**
 * @file   packages/domain/src/sealing.ts
 * @brief  Sealing a show: the shuffled assignment, the secret and the commitment.
 *
 * Responsibility: shuffle W prize artifacts and N − W blanks over the N cases through the
 *                 random port (Fisher–Yates), draw a 32-byte secret, and commit to both with
 *                 sha256 over their canonical JSON (CONCEPT §3.3, §8). `verify` is the check
 *                 anyone can redo after the show from the revealed assignment and secret.
 * Depends on:     node:crypto (sha256, pure computation), @sc/contracts (types), ./random.js,
 *                 ./setup.js
 */
import { createHash } from 'node:crypto';

import type { AssignmentEntry } from '@sc/contracts';

import type { RandomPort } from './random.js';
import { blankId, prizeId } from './setup.js';

const SECRET_BYTES = 32;

export interface SealResult {
  readonly assignment: AssignmentEntry[];
  readonly secret: string;
  readonly commitment: string;
}

/**
 * The canonical text the commitment hashes: the assignment sorted by case number, each entry
 * as [caseNumber, artifactId], then the secret, with no whitespace. Key order and spacing never
 * depend on how the objects were built.
 */
export function canonicalJson(assignment: readonly AssignmentEntry[], secret: string): string {
  const pairs = [...assignment]
    .sort((a, b) => a.caseNumber - b.caseNumber)
    .map((e) => [e.caseNumber, e.artifactId]);
  return JSON.stringify({ assignment: pairs, secret });
}

/** sha256 over the canonical JSON, as lower-case hex. */
export function commitmentOf(assignment: readonly AssignmentEntry[], secret: string): string {
  return createHash('sha256').update(canonicalJson(assignment, secret)).digest('hex');
}

/** Whether this assignment and secret are the ones the commitment was made over. */
export function verify(
  assignment: readonly AssignmentEntry[],
  secret: string,
  commitment: string,
): boolean {
  return commitmentOf(assignment, secret) === commitment;
}

/** Draws the contents of every case and commits to them. */
export function seal(caseCount: number, winners: number, random: RandomPort): SealResult {
  const ids = [
    ...Array.from({ length: winners }, (_, i) => prizeId(i + 1)),
    ...Array.from({ length: caseCount - winners }, (_, i) => blankId(i + 1)),
  ];
  // Fisher–Yates: every order is equally likely when the port is uniform.
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = random.int(i + 1);
    const a = ids[i];
    const b = ids[j];
    if (a === undefined || b === undefined) throw new Error('shuffle index out of range');
    ids[i] = b;
    ids[j] = a;
  }
  const assignment = ids.map((artifactId, i) => ({ caseNumber: i + 1, artifactId }));
  const secret = random.hex(SECRET_BYTES);
  return { assignment, secret, commitment: commitmentOf(assignment, secret) };
}
