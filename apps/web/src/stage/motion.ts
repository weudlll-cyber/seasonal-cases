/**
 * @file   apps/web/src/stage/motion.ts
 * @brief  The stage's motion: every duration in one settings object, exposed as CSS variables.
 *
 * Responsibility: the travel to the front and back, the slow opening of the lid and the short
 *                 closing before the way back (DECISIONS D21). The values are the chain's
 *                 decision rule (0.8 s ease-in-out travel, 1.6 s opening), proposals for the
 *                 owner (HANDOVER); the settings catalogue takes them over (piece 8). Under
 *                 reduced motion the kit's motion.css switches every transition and animation
 *                 off, and `motionMs` answers 0, so the stage shows end states at once.
 * Depends on:     react (types)
 */
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
  travelMs: 800,
  travelEase: 'ease-in-out',
  openMs: 1600,
  closeMs: 300,
};

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
