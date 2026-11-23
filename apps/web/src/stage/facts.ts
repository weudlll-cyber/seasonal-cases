/**
 * @file   apps/web/src/stage/facts.ts
 * @brief  How many cases and prizes are left, counted from the received view.
 *
 * Responsibility: one count for the game bar's facts (../shell/FocusBar.tsx) and the early-end
 *                 question (./DirectionBar.tsx, DECISIONS D33). A prize counts as found once its
 *                 case is open, won or not (an unclaimed case's prize too, D34).
 * Depends on:     @sc/contracts (types)
 */
import type { PublicShowView } from '@sc/contracts';

export function showFacts(show: PublicShowView): { casesLeft: number; prizesLeft: number } {
  const opened = show.cases.filter((c) => c.opened);
  const prizesFound = opened.filter((c) => c.artifact?.prizeSlot !== null).length;
  return { casesLeft: show.caseCount - opened.length, prizesLeft: show.winnerCount - prizesFound };
}
