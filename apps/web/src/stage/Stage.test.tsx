/**
 * @file   apps/web/src/stage/Stage.test.tsx
 * @brief  Tests the stage: every step state rendered from a given view, and the direction bar
 *         for the direction holder only (after the end: ./moments.test.tsx).
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANA, KEY, LEAF, liveView, MIA, organiserOf, NOAH } from '../testing/views.js';
import { Stage } from './Stage.js';

afterEach(cleanup);

const direct = vi.fn(() => Promise.resolve({ ok: true as const }));

function renderStage(
  step: Parameters<typeof liveView>[0],
  artifact = liveView('idle').artifactTable[0],
) {
  const show = liveView(step, artifact);
  return render(<Stage show={show} organiser={null} me={ANA} direct={direct} />);
}

describe('the step states', () => {
  it('idle: every case on the stage with its number and owner, nothing dimmed', () => {
    const { container } = renderStage('idle');
    expect(container.querySelectorAll('.case-token')).toHaveLength(12);
    expect(screen.getByLabelText('Case 7, Ana')).toBeDefined();
    expect(container.querySelector('.stage-screen')?.getAttribute('data-dimmed')).toBe('false');
    expect(container.querySelector('.centre')).toBeNull();
  });

  it('selected: the case comes to the front, the lights go down, no content yet', () => {
    const { container } = renderStage('selected');
    expect(container.querySelector('.stage-screen')?.getAttribute('data-dimmed')).toBe('true');
    const centre = container.querySelector('.centre');
    expect(centre?.querySelector('.cp-number')?.textContent).toBe('7');
    expect(centre?.querySelector('.case-picture')?.getAttribute('data-state')).toBe('closed');
    expect(centre?.querySelector('.artifact')).toBeNull();
    expect(centre?.querySelector('.centre-meaning')).toBeNull();
  });

  it('open: the artifact appears with its meaning, "Prize 1 · Gold"', () => {
    const { container } = renderStage('open');
    expect(container.querySelector('.centre [data-artifact]')?.getAttribute('data-artifact')).toBe(
      'Halving Stone',
    );
    expect(container.querySelector('.centre-meaning')?.textContent).toBe('Prize 1 · Gold');
    expect(container.querySelector('.lower-third')).toBeNull();
  });

  it('open on a prize without a label: "Prize 2"; on a blank: "No prize"', () => {
    const { container } = renderStage('open', KEY);
    expect(container.querySelector('.centre-meaning')?.textContent).toBe('Prize 2');
    cleanup();
    const blank = renderStage('open', LEAF);
    expect(blank.container.querySelector('.centre-meaning')?.textContent).toBe('No prize');
  });

  it('owner: the lower third with the name and rank badge, confetti on the main prize', () => {
    const { container } = renderStage('owner');
    const lower = screen.getByRole('status');
    expect(lower.textContent).toContain('Ana');
    expect(within(lower).getByText('Rank 3')).toBeDefined();
    expect(container.querySelector('.confetti')).not.toBeNull();
  });

  it('owner on a blank: the lower third without confetti', () => {
    const { container } = renderStage('owner', LEAF);
    expect(screen.getByRole('status').textContent).toContain('Ana');
    expect(container.querySelector('.confetti')).toBeNull();
  });
});

describe('the direction bar', () => {
  it('appears for the direction holder, with the next step enabled', () => {
    const show = liveView('selected');
    render(<Stage show={show} organiser={organiserOf(show, MIA)} me={MIA} direct={direct} />);
    const bar = screen.getByRole('navigation', { name: 'Direction' });
    expect(within(bar).getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(false);
    expect(within(bar).getByRole('button', { name: 'Owner' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(within(bar).getByRole('button', { name: 'Open' }));
    expect(direct).toHaveBeenCalledWith('direction:step', { showId: 'show-1', step: 'open' });
  });

  it('lets the holder select a case by clicking it', () => {
    const show = liveView('idle');
    render(<Stage show={show} organiser={organiserOf(show, MIA)} me={MIA} direct={direct} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Case 3, bot-3' }));
    expect(direct).toHaveBeenCalledWith('direction:select', { showId: 'show-1', caseNumber: 3 });
  });

  it('does not appear for another organiser, a player or a guest', () => {
    const show = liveView('selected');
    for (const [me, organiser] of [
      [NOAH, organiserOf(show, MIA)],
      [ANA, null],
      [null, null],
    ] as const) {
      render(<Stage show={show} organiser={organiser} me={me} direct={direct} />);
      expect(screen.queryByRole('navigation', { name: 'Direction' })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Select Case/ })).toBeNull();
      cleanup();
    }
  });
});
