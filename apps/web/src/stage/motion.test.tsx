/**
 * @file   apps/web/src/stage/motion.test.tsx
 * @brief  Tests the stage's motion: the settings and the opening's phases as CSS variables,
 *         the phases' order and bounds, the travel's inverse transform, the case on its way home
 *         with its lid open, and no artifact while the view has none.
 */
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANA, liveView } from '../testing/views.js';
import { LID_OPEN_DEG, motionVars, OPEN_PHASES, phaseVars, STAGE_MOTION } from './motion.js';
import { Stage } from './Stage.js';
import { inverse, useReturn } from './travel.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const direct = vi.fn(() => Promise.resolve({ ok: true as const }));

describe('the motion settings', () => {
  it('hold every duration in one place and give them to the stage as CSS variables', () => {
    expect(STAGE_MOTION).toEqual({
      travelMs: 800,
      travelEase: 'ease-in-out',
      openMs: 1600,
      closeMs: 300,
    });
    expect(motionVars()).toMatchObject({
      '--travel-ms': '800ms',
      '--travel-ease': 'ease-in-out',
      '--lid-open-deg': '105deg',
      '--lid-delay': '160ms',
      '--lid-ms': '960ms',
    });
    const { container } = render(
      <Stage show={liveView('idle')} organiser={null} me={ANA} direct={direct} />,
    );
    const root = container.querySelector<HTMLElement>('.stage-screen');
    expect(root?.style.getPropertyValue('--lid-ms')).toBe('960ms');
  });
});

describe('the opening’s phases (D49)', () => {
  const phases = Object.values(OPEN_PHASES);

  it('stay within the opening, each a real span', () => {
    for (const phase of phases) {
      expect(phase.from).toBeGreaterThanOrEqual(0);
      expect(phase.to).toBeLessThanOrEqual(1);
      expect(phase.to).toBeGreaterThan(phase.from);
    }
  });

  it('flip the latches first, then swing the lid, and let nothing of the artifact out before 55 %', () => {
    const { latches, lid, glow, artifact } = OPEN_PHASES;
    expect(latches).toEqual({ from: 0, to: 0.1 });
    expect(lid).toEqual({ from: 0.1, to: 0.7 });
    expect(glow.from).toBe(0.3);
    expect(artifact.from).toBe(0.55);
    expect(artifact.from).toBeGreaterThan(lid.from);
    expect(LID_OPEN_DEG).toBe(105);
  });

  it('show the meaning last: it starts after every other phase and ends with the opening', () => {
    const { meaning, ...others } = OPEN_PHASES;
    for (const phase of Object.values(others)) expect(meaning.from).toBeGreaterThan(phase.from);
    expect(meaning).toEqual({ from: 0.85, to: 1 });
  });

  it('scale with the show’s opening: a slower opening stretches every phase alike', () => {
    expect(phaseVars(3200)).toMatchObject({
      '--artifact-delay': '1760ms',
      '--artifact-ms': '1440ms',
      '--meaning-delay': '2720ms',
      '--meaning-ms': '480ms',
    });
  });
});

describe('inverse', () => {
  it('moves and scales the front box onto the case’s place, centre on centre', () => {
    const place = { left: 100, top: 300, width: 80, height: 60 };
    const front = { left: 500, top: 200, width: 240, height: 180 };
    expect(inverse(place, front)).toBe('translate(-480.0px, 40.0px) scale(0.333, 0.333)');
  });
});

describe('the way home', () => {
  it('keeps the case that went back to the stage until it is home, and drops it for a new one', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook<number | null, { selected: number | null }>(
      ({ selected }) => useReturn(selected),
      { initialProps: { selected: 7 } },
    );
    expect(result.current).toBeNull();
    rerender({ selected: null });
    expect(result.current).toBe(7);
    act(() => {
      vi.advanceTimersByTime(STAGE_MOTION.closeMs + STAGE_MOTION.travelMs);
    });
    expect(result.current).toBeNull();
    rerender({ selected: 3 });
    rerender({ selected: null });
    expect(result.current).toBe(3);
    rerender({ selected: 5 });
    expect(result.current).toBeNull();
  });
});

describe('the front case', () => {
  it('draws no artifact while the view has none, and the artifact once it has', () => {
    const selected = render(
      <Stage show={liveView('selected')} organiser={null} me={ANA} direct={direct} />,
    );
    expect(selected.container.querySelector('.centre .artifact')).toBeNull();
    expect(selected.container.querySelector('.case-token[data-case="7"]')?.className).toContain(
      'is-away',
    );
    cleanup();
    const open = render(
      <Stage show={liveView('open')} organiser={null} me={ANA} direct={direct} />,
    );
    expect(open.container.querySelector('.centre-case.is-open .artifact')).not.toBeNull();
    expect(open.container.querySelector('.centre .case-picture')?.getAttribute('data-state')).toBe(
      'opening',
    );
  });
});
