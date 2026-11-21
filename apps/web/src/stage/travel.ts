/**
 * @file   apps/web/src/stage/travel.ts
 * @brief  The case's travel between its place on the half circle and the front, measured.
 *
 * Responsibility: one continuous motion from the case's real position (DECISIONS D21): measure
 *                 the start and end rectangles, place the front case onto its place with an
 *                 inverse transform, then let a CSS transition take it to the front, or back.
 *                 Nothing fades out and reappears. `useReturn` keeps a case that went back to the
 *                 stage on screen while it closes and travels home. A new view replaces the
 *                 picture at once: a new selection ends any travel in progress.
 * Depends on:     react, ./motion.js
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { motionMs, STAGE_MOTION } from './motion.js';

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** The transform that moves and scales a box at `to` onto `from` (centre on centre). */
export function inverse(from: Box, to: Box): string {
  const sx = to.width > 0 ? from.width / to.width : 1;
  const sy = to.height > 0 ? from.height / to.height : 1;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
}

const TRAVEL = 'transform var(--travel-ms) var(--travel-ease)';

/** The case's place on the half circle, as the stage lays it out. */
function placeOf(el: HTMLElement, caseNumber: number): DOMRect | null {
  const root = el.closest('.stage-screen');
  const place = root?.querySelector(`.case-token[data-case="${String(caseNumber)}"] .case-body`);
  return place instanceof HTMLElement ? place.getBoundingClientRect() : null;
}

/** On arrival, the front case starts on its place and travels to the front. */
export function useArrival(
  ref: RefObject<HTMLElement | null>,
  caseNumber: number,
  active: boolean,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || el === null || motionMs(STAGE_MOTION.travelMs) === 0) return;
    const place = placeOf(el, caseNumber);
    if (place === null) return;
    el.style.transition = 'none';
    el.style.transform = inverse(place, el.getBoundingClientRect());
    // Read the layout once, so the browser starts the transition from the place.
    el.getBoundingClientRect();
    el.style.transition = TRAVEL;
    el.style.transform = '';
  }, [ref, caseNumber, active]);
}

/** After "Back to stage": the case closes at the front, then travels to its place. */
export function useHomeward(
  ref: RefObject<HTMLElement | null>,
  caseNumber: number,
  active: boolean,
) {
  useEffect(() => {
    const el = ref.current;
    if (!active || el === null) return undefined;
    const timer = window.setTimeout(() => {
      const place = placeOf(el, caseNumber);
      if (place === null) return;
      el.style.transition = TRAVEL;
      el.style.transform = inverse(place, el.getBoundingClientRect());
    }, motionMs(STAGE_MOTION.closeMs));
    return () => {
      window.clearTimeout(timer);
    };
  }, [ref, caseNumber, active]);
}

/**
 * The case on its way back to the stage, or null: set when the selection goes from a case to
 * none, cleared once it is home or as soon as another case is selected.
 */
export function useReturn(selected: number | null): number | null {
  const previous = useRef(selected);
  const [returning, setReturning] = useState<number | null>(null);
  useEffect(() => {
    const was = previous.current;
    previous.current = selected;
    if (selected !== null || was === null) {
      setReturning(null);
      return undefined;
    }
    setReturning(was);
    const timer = window.setTimeout(
      () => {
        setReturning(null);
      },
      motionMs(STAGE_MOTION.closeMs + STAGE_MOTION.travelMs),
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [selected]);
  return returning;
}
