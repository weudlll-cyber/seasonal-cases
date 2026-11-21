/**
 * @file   packages/domain/src/setup.ts
 * @brief  The limits of a show's setup: N cases and W winners (CONCEPT §3.1).
 *
 * Responsibility: say whether a setup is valid and, if not, why.
 * Depends on:     nothing
 */

// 2 ≤ N ≤ 99 and 1 ≤ W ≤ N (night chain SC-N1, piece 2; DECISIONS D3).
export const CASE_LIMITS = { minCases: 2, maxCases: 99, minWinners: 1 } as const;

export interface SetupInput {
  readonly cases: number;
  readonly winners: number;
}

/** The first reason the setup is invalid, or null when it is valid. */
export function setupProblem({ cases, winners }: SetupInput): string | null {
  if (!Number.isInteger(cases) || cases < CASE_LIMITS.minCases || cases > CASE_LIMITS.maxCases) {
    return `cases must be a whole number from ${String(CASE_LIMITS.minCases)} to ${String(CASE_LIMITS.maxCases)}`;
  }
  if (!Number.isInteger(winners) || winners < CASE_LIMITS.minWinners || winners > cases) {
    return `winners must be a whole number from ${String(CASE_LIMITS.minWinners)} to the number of cases`;
  }
  return null;
}
