/**
 * @file   packages/domain/src/registration.ts
 * @brief  Case claims: who holds which case, the conflict view, the close, and the bots.
 *
 * Responsibility: a player holds at most one claim at a time; a new claim replaces their
 *                 earlier one. Per case the highest rank wins; with equal rank the earliest
 *                 claim time, and with the same time the claim made first (DECISIONS D5).
 *                 Bots fill every case nobody claimed, with a rank from the random port.
 * Depends on:     @sc/contracts (types), ./events.js, ./random.js
 */
import { RANK_MAX, type BoardCase, type Claimant, type Rank, type Standing } from '@sc/contracts';

import type { Actor, ShowEvent } from './events.js';
import type { RandomPort } from './random.js';

export interface Claim {
  readonly at: string;
  readonly player: Actor;
  readonly rank: Rank;
  readonly caseNumber: number;
  // The claim's place in the show's claims; breaks a tie of rank and time.
  readonly seq: number;
}

/** Each player's latest claim, in the order those claims were made. */
export function currentClaims(claims: readonly Claim[]): Claim[] {
  const latest = new Map<string, Claim>();
  for (const claim of claims) latest.set(claim.player.id, claim);
  return [...latest.values()].sort((a, b) => a.seq - b.seq);
}

/** Negative when `a` wins the case over `b`: higher rank, then earlier time, then made first. */
export function compareClaims(a: Claim, b: Claim): number {
  if (a.rank !== b.rank) return b.rank - a.rank;
  const time = Date.parse(a.at) - Date.parse(b.at);
  return time !== 0 ? time : a.seq - b.seq;
}

/** The current claims on one case, the winning claim first. */
export function claimsOn(claims: readonly Claim[], caseNumber: number): Claim[] {
  return currentClaims(claims)
    .filter((c) => c.caseNumber === caseNumber)
    .sort(compareClaims);
}

const claimant = (c: Claim): Claimant => ({
  playerId: c.player.id,
  name: c.player.name,
  steps: [],
  rank: c.rank,
  at: c.at,
});

/** The conflict view: per case the winning claimant and every other with rank and time. */
export function board(claims: readonly Claim[], caseCount: number): BoardCase[] {
  return Array.from({ length: caseCount }, (_, i) => {
    const [holder, ...others] = claimsOn(claims, i + 1);
    return {
      number: i + 1,
      holder: holder === undefined ? null : claimant(holder),
      others: others.map(claimant),
    };
  });
}

/** Each case's winning claim at the close of registration; index i is case i + 1. */
export function ownersAtClose(claims: readonly Claim[], caseCount: number): (Claim | null)[] {
  return Array.from({ length: caseCount }, (_, i) => claimsOn(claims, i + 1)[0] ?? null);
}

/** Where a player of this rank would stand on each case if they picked it now. */
export function standings(
  claims: readonly Claim[],
  caseCount: number,
  player: { readonly id: string; readonly rank: Rank },
): { number: number; standing: Standing }[] {
  return Array.from({ length: caseCount }, (_, i) => {
    const holder = claimsOn(claims, i + 1)[0];
    let standing: Standing;
    if (holder === undefined) standing = 'free';
    else if (holder.player.id === player.id) standing = 'yours';
    else if (player.rank > holder.rank) standing = 'higher';
    else standing = player.rank === holder.rank ? 'equal' : 'lower';
    return { number: i + 1, standing };
  });
}

// Bot ids cannot collide with a signed-in user's id, which the server draws as a UUID.
export const botId = (caseNumber: number): string => `bot-${String(caseNumber)}`;

/** One claim event per case nobody claims: a bot "bot-<case>", rank 0–5 from the port. */
export function botClaims(
  claims: readonly Claim[],
  caseCount: number,
  random: RandomPort,
  at: string,
): ShowEvent[] {
  const events: ShowEvent[] = [];
  for (let caseNumber = 1; caseNumber <= caseCount; caseNumber += 1) {
    if (claimsOn(claims, caseNumber).length > 0) continue;
    const name = botId(caseNumber);
    events.push({
      type: 'claimed',
      at,
      player: { id: name, name },
      rank: random.int(RANK_MAX + 1),
      caseNumber,
    });
  }
  return events;
}
