/**
 * @file   apps/web/src/stage/applause.test.tsx
 * @brief  Tests the applause on the client (D39): three steps from the last 10 s, capped; a quiet
 *         stage falls back to the first; the count on the stage; the confetti's pieces per step.
 */
import type { Applause } from '@sc/contracts';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANA, liveView } from '../testing/views.js';
import { applauseStep, confettiPieces, QUIET_AFTER_MS, useApplauseStep } from './applause.js';
import { Confetti } from './LowerThird.js';
import { Stage } from './Stage.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const clapped = (recent: number, total = recent): Applause => ({ showId: 'show-1', total, recent });

describe('the applause steps', () => {
  it('are three, capped: below 5, below 20, from 20 on', () => {
    expect([0, 4, 5, 19, 20, 500].map(applauseStep)).toEqual([1, 1, 2, 2, 3, 3]);
    expect([1, 2, 3].map((s) => confettiPieces(36, s as 1 | 2 | 3))).toEqual([36, 54, 72]);
  });

  it('fall back to the first once 10 s pass without a new count', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ a }) => useApplauseStep(a), {
      initialProps: { a: null as Applause | null },
    });
    expect(result.current).toBe(1);
    rerender({ a: clapped(25) });
    expect(result.current).toBe(3);
    act(() => {
      vi.advanceTimersByTime(QUIET_AFTER_MS);
    });
    expect(result.current).toBe(1);
  });
});

describe('the applause on the stage', () => {
  const direct = vi.fn(() => Promise.resolve({ ok: true as const }));

  it('shows the count once someone clapped', () => {
    const quiet = render(
      <Stage show={liveView('idle')} organiser={null} me={ANA} direct={direct} />,
    );
    expect(quiet.container.querySelector('.applause-count')).toBeNull();
    cleanup();
    const { container } = render(
      <Stage
        show={liveView('idle')}
        organiser={null}
        me={ANA}
        direct={direct}
        applause={clapped(3, 12)}
      />,
    );
    expect(container.querySelector('.applause-count')?.textContent).toBe('Applause 12');
  });

  it('grows the main prize’s confetti with the step', () => {
    const { container } = render(<Confetti show={liveView('owner')} step={3} />);
    expect(container.querySelectorAll('.confetti-piece')).toHaveLength(72);
    cleanup();
    const quiet = render(<Confetti show={liveView('owner')} />);
    expect(quiet.container.querySelectorAll('.confetti-piece')).toHaveLength(36);
  });
});
