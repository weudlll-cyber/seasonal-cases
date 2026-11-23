/**
 * @file   apps/web/src/stage/applause.ts
 * @brief  What the stage makes of the applause it receives: the confetti's step (DECISIONS D39).
 *
 * Responsibility: three steps from the applause of the last 10 s, capped: step 1 below 5
 *                 claps, step 2 below 20, step 3 from 20 on; the confetti has 1, 1.5 or 2 times
 *                 its pieces. The server sends the count only when someone claps, so a quiet
 *                 stage falls back to step 1 by itself 10 s after the last count. The applause
 *                 changes nothing of the show (CONCEPT §1).
 * Depends on:     react, @sc/contracts (types)
 */
import type { Applause } from '@sc/contracts';
import { useEffect, useState } from 'react';

export type ApplauseStep = 1 | 2 | 3;

export const QUIET_AFTER_MS = 10_000;
const PIECE_FACTOR: Record<ApplauseStep, number> = { 1: 1, 2: 1.5, 3: 2 };

/** The step for this many claps in the last 10 s. */
export function applauseStep(recent: number): ApplauseStep {
  if (recent >= 20) return 3;
  return recent >= 5 ? 2 : 1;
}

/** The confetti's pieces at a step. */
export const confettiPieces = (base: number, step: ApplauseStep): number =>
  Math.round(base * PIECE_FACTOR[step]);

/** The step of the latest applause, back to 1 once 10 s pass without a new count. */
export function useApplauseStep(applause: Applause | null): ApplauseStep {
  const [quiet, setQuiet] = useState(true);
  useEffect(() => {
    if (applause === null) return undefined;
    setQuiet(false);
    const timer = window.setTimeout(() => {
      setQuiet(true);
    }, QUIET_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [applause]);
  return quiet || applause === null ? 1 : applauseStep(applause.recent);
}
