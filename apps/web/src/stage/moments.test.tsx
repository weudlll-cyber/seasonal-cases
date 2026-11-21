/**
 * @file   apps/web/src/stage/moments.test.tsx
 * @brief  Tests the stage's moments: the opening (Begin for the holder only, no click on a case
 *         before it) and the ceremony's sequence with faked timers.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANA, liveView, MIA, organiserOf, resultOf } from '../testing/views.js';
import { Ceremony, CEREMONY_STEP_MS, ceremonyOrder } from './Ceremony.js';
import { Stage } from './Stage.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const direct = vi.fn(() => Promise.resolve({ ok: true as const }));

describe('the opening', () => {
  const opening = {
    ...liveView('idle'),
    live: { begun: false, selected: null, step: 'idle' as const },
  };

  it('shows title, facts and table to everyone, and Begin only to the holder', () => {
    render(<Stage show={opening} organiser={null} me={ANA} direct={direct} />);
    const region = screen.getByRole('region', { name: 'Opening' });
    expect(region.textContent).toContain('12 cases · 2 prizes');
    expect(within(region).getByText('Prize 1: Gold')).toBeDefined();
    expect(within(region).queryByRole('button', { name: 'Begin' })).toBeNull();
  });

  it('lets the holder begin, and offers no case to click before that', () => {
    render(<Stage show={opening} organiser={organiserOf(opening, MIA)} me={MIA} direct={direct} />);
    expect(screen.queryByRole('button', { name: /^Select Case/ })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Direction' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }));
    expect(direct).toHaveBeenCalledWith('direction:begin', { showId: 'show-1' });
  });
});

describe('the ceremony', () => {
  it('orders the winners from the lowest prize up to the main prize', () => {
    expect(ceremonyOrder(resultOf(true)).map((w) => w.slot)).toEqual([2, 1]);
  });

  it('shows one winner after another every 2.5 s, then the way to the result', () => {
    vi.useFakeTimers();
    render(<Ceremony showId="show-1" result={resultOf(true)} />);
    expect(screen.getByRole('status').textContent).toContain('bot-9');
    expect(document.querySelector('.confetti')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(CEREMONY_STEP_MS);
    });
    expect(screen.getByRole('status').textContent).toContain('Ana');
    expect(document.querySelector('.confetti')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'See the result' })).toBeNull();
    act(() => {
      vi.advanceTimersByTime(CEREMONY_STEP_MS);
    });
    expect(screen.getByRole('link', { name: 'See the result' })).toBeDefined();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('takes the stage after the end, without the direction bar', () => {
    const ended = { ...liveView('idle'), state: 'ended' as const, result: resultOf(true) };
    render(<Stage show={ended} organiser={organiserOf(ended, MIA)} me={MIA} direct={direct} />);
    expect(screen.getByRole('region', { name: 'The winners' })).toBeDefined();
    expect(screen.queryByRole('navigation', { name: 'Direction' })).toBeNull();
  });
});
