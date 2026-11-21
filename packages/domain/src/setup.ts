/**
 * @file   packages/domain/src/setup.ts
 * @brief  A show's setup: the limits of N and W, the prize slots and the artifact table.
 *
 * Responsibility: say whether a setup is valid and, if not, why (CONCEPT §3.1); build the
 *                 artifact table from the settings (CONCEPT §6).
 * Depends on:     @sc/contracts (types), ./settings.js
 */
import type { Artifact, PrizeSlot, Season } from '@sc/contracts';

import type { ShowSettings } from './settings.js';

// 2 ≤ N ≤ 99 and 1 ≤ W ≤ N (DECISIONS D3).
export const CASE_LIMITS = { minCases: 2, maxCases: 99, minWinners: 1 } as const;

export interface SetupInput {
  readonly cases: number;
  readonly winners: number;
  readonly labels?: readonly string[];
}

/** The first reason the setup is invalid, or null when it is valid. */
export function setupProblem({ cases, winners, labels = [] }: SetupInput): string | null {
  if (!Number.isInteger(cases) || cases < CASE_LIMITS.minCases || cases > CASE_LIMITS.maxCases) {
    return `cases must be a whole number from ${String(CASE_LIMITS.minCases)} to ${String(CASE_LIMITS.maxCases)}`;
  }
  if (!Number.isInteger(winners) || winners < CASE_LIMITS.minWinners || winners > cases) {
    return `winners must be a whole number from ${String(CASE_LIMITS.minWinners)} to the number of cases`;
  }
  if (labels.length > winners) return 'there are more prize labels than winners';
  return null;
}

/** Slots 1…W, each with its label or '' (shown as "Prize n"). */
export function prizeSlots(winners: number, labels: readonly string[]): PrizeSlot[] {
  return Array.from({ length: winners }, (_, i) => ({
    slot: i + 1,
    label: (labels[i] ?? '').trim(),
  }));
}

export interface ArtifactTable {
  readonly prizes: readonly Artifact[];
  readonly blank: Artifact;
}

// The id of the k-th blank artifact in a sealing; all blanks share the table's blank entry.
export const BLANK_ID = 'blank';
export const blankId = (k: number): string => `${BLANK_ID}-${String(k)}`;
export const prizeId = (slot: number): string => `prize-${String(slot)}`;

/** The prize artifacts for slots 1…W and the blank, from the settings. */
export function artifactTable(
  settings: ShowSettings,
  winners: number,
  season: Season,
): ArtifactTable {
  const prizes = Array.from({ length: winners }, (_, i): Artifact => {
    const slot = i + 1;
    const setting = settings.prizeArtifacts[i];
    const name = setting?.name ?? settings.relicName.replace('{n}', String(slot));
    const own = setting?.season ?? 'current';
    return { id: prizeId(slot), name, season: own === 'current' ? season : own, prizeSlot: slot };
  });
  const blank: Artifact = { id: BLANK_ID, name: settings.blankName, season, prizeSlot: null };
  return { prizes, blank };
}
