/**
 * @file   apps/web/src/stage/motion.ts
 * @brief  The stage's motion: every duration in one settings object, exposed as CSS variables.
 *
 * Responsibility: the travel to the front and back, the slow opening of the lid and the short
 *                 closing before the way back (DECISIONS D21). The travel and the opening are the
 *                 show's own, copied from the settings catalogue when it was created (D25,
 *                 `motionOf`); the ease and the closing stay fixed here. Under
 *                 reduced motion the kit's motion.css switches every transition and animation
 *                 off, and `motionMs` answers 0, so the stage shows end states at once.
 * Depends on:     react (types), @sc/contracts
 */
import { DEFAULT_SETTINGS, type Presentation } from '@sc/contracts';
import type { CSSProperties } from 'react';

export interface StageMotion {
  // The case's way from its place on the half circle to the front, and back.
  readonly travelMs: number;
  readonly travelEase: string;
  // The lid lifting at "Open"; the artifact rises in its second half, the meaning last.
  readonly openMs: number;
  // The case closing at the front before it travels back.
  readonly closeMs: number;
}

export const STAGE_MOTION: StageMotion = {
  travelMs: DEFAULT_SETTINGS.presentation.travelMs,
  travelEase: 'ease-in-out',
  openMs: DEFAULT_SETTINGS.presentation.openMs,
  closeMs: 300,
};

/** The motion of a show: its own travel and opening, the fixed ease and closing. */
export const motionOf = (presentation: Presentation): StageMotion => ({
  ...STAGE_MOTION,
  travelMs: presentation.travelMs,
  openMs: presentation.openMs,
});

/** The motion as CSS variables on the stage's root. */
export function motionVars(motion: StageMotion = STAGE_MOTION): CSSProperties {
  return {
    '--travel-ms': `${String(motion.travelMs)}ms`,
    '--travel-ease': motion.travelEase,
    '--open-ms': `${String(motion.openMs)}ms`,
    '--close-ms': `${String(motion.closeMs)}ms`,
  } as CSSProperties;
}

/** A duration as the page will play it: 0 under reduced motion. */
export function motionMs(ms: number): number {
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduce ? 0 : ms;
}
