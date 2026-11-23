/**
 * @file   apps/web/src/stage/motion.ts
 * @brief  The stage's motion: every duration and the opening's phases in one place, exposed as
 *         CSS variables.
 *
 * Responsibility: the travel to the front and back, the slow opening of the case and the short
 *                 beat before the way back (DECISIONS D21, D49). The travel and the opening are
 *                 the show's own, copied from the settings catalogue when it was created (D25,
 *                 `motionOf`); the ease, the beat and the opening's phases stay fixed here. The
 *                 phases are shares of the opening's duration (`OPEN_PHASES`), given to
 *                 ./case.css as a delay and a length each. Under reduced motion the kit's
 *                 motion.css switches every transition and animation off, and `motionMs` answers
 *                 0, so the stage shows end states at once.
 * Depends on:     react (types), @sc/contracts
 */
import { DEFAULT_SETTINGS, type Presentation } from '@sc/contracts';
import type { CSSProperties } from 'react';

export interface StageMotion {
  // The case's way from its place on the half circle to the front, and back.
  readonly travelMs: number;
  readonly travelEase: string;
  // The opening at "Open", in the phases of `OPEN_PHASES`.
  readonly openMs: number;
  // The beat at the front after "Back to stage" before the opened case travels home, lid open.
  readonly closeMs: number;
}

/** A part of the opening: from and to, as shares of the opening's duration. */
export interface OpenPhase {
  readonly from: number;
  readonly to: number;
}

/**
 * The opening, in order: the latches flip; the lid swings about its back edge towards the viewer
 * (ease-out) to `LID_OPEN_DEG`; the season glow grows in the lining; the artifact rises out of
 * the case, never before 55 %; its meaning fades in last.
 */
export const OPEN_PHASES = {
  latches: { from: 0, to: 0.1 },
  lid: { from: 0.1, to: 0.7 },
  glow: { from: 0.3, to: 1 },
  artifact: { from: 0.55, to: 1 },
  meaning: { from: 0.85, to: 1 },
} as const satisfies Record<string, OpenPhase>;

export type OpenPhaseName = keyof typeof OPEN_PHASES;

/** How far the lid stands open: a little past upright, its inner face to the viewer. */
export const LID_OPEN_DEG = 105;

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

const ms = (value: number): string => `${String(Math.round(value))}ms`;

/** Each phase as `--<phase>-delay` and `--<phase>-ms` for an opening of `openMs`. */
export function phaseVars(openMs: number): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [name, phase] of Object.entries(OPEN_PHASES)) {
    vars[`--${name}-delay`] = ms(openMs * phase.from);
    vars[`--${name}-ms`] = ms(openMs * (phase.to - phase.from));
  }
  return vars;
}

/** The motion as CSS variables on the stage's root. */
export function motionVars(motion: StageMotion = STAGE_MOTION): CSSProperties {
  return {
    '--travel-ms': ms(motion.travelMs),
    '--travel-ease': motion.travelEase,
    '--open-ms': ms(motion.openMs),
    '--close-ms': ms(motion.closeMs),
    '--lid-open-deg': `${String(LID_OPEN_DEG)}deg`,
    ...phaseVars(motion.openMs),
  } as CSSProperties;
}

/** A duration as the page will play it: 0 under reduced motion. */
export function motionMs(ms: number): number {
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduce ? 0 : ms;
}
