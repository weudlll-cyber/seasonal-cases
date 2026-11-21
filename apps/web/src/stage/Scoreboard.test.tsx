/**
 * @file   apps/web/src/stage/Scoreboard.test.tsx
 * @brief  Tests the scoreboard's three row states from a given view: open, lit, taken.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { KEY, LEAF, liveView, STONE } from '../testing/views.js';
import { Scoreboard, scoreRows } from './Scoreboard.js';

afterEach(cleanup);

const states = (show: Parameters<typeof scoreRows>[0]) =>
  scoreRows(show).map((r) => [r.artifact.name, r.state, r.owner]);

describe('scoreRows', () => {
  it('shows every prize in slot order, then the blank, all open before anything is opened', () => {
    expect(states(liveView('selected'))).toEqual([
      ['Halving Stone', 'open', null],
      ['Season Key', 'open', null],
      ['Fallen Leaf', 'open', null],
    ]);
  });

  it('lights a prize when its case opens, and names the owner from the "Owner" step', () => {
    expect(states(liveView('open'))[0]).toEqual(['Halving Stone', 'lit', null]);
    expect(states(liveView('owner'))[0]).toEqual(['Halving Stone', 'lit', 'Ana']);
  });

  it('strikes a prize through once its case has left the front, keeping the owner', () => {
    // Case 3 held the Season Key and is back on the stage; case 7 is selected now.
    const show = liveView('selected', STONE, { 3: KEY });
    expect(states(show)[1]).toEqual(['Season Key', 'taken', 'bot-3']);
  });

  it('lights the blank row while a blank is open at the front, and never takes it', () => {
    expect(states(liveView('open', LEAF))[2]).toEqual(['Fallen Leaf', 'lit', null]);
    const later = liveView('selected', STONE, { 3: { ...LEAF, id: 'blank-1' } });
    expect(states(later)[2]).toEqual(['Fallen Leaf', 'open', null]);
  });
});

describe('Scoreboard', () => {
  it('renders the rows with their meaning, a struck-through state, and the commitment', () => {
    render(<Scoreboard show={liveView('selected', STONE, { 3: KEY })} />);
    const rows = screen.getByRole('list', { name: 'Scoreboard' }).querySelectorAll('li');
    expect([...rows].map((r) => r.getAttribute('data-state'))).toEqual(['open', 'taken', 'open']);
    expect(rows[0]?.textContent).toContain('Prize 1: Gold');
    expect(rows[2]?.textContent).toContain('no prize');
    expect(screen.getByText(/^commitment c0ffee/)).toBeDefined();
  });

  it('is not there before sealing', () => {
    const { container } = render(<Scoreboard show={{ ...liveView('idle'), commitment: null }} />);
    expect(container.innerHTML).toBe('');
  });
});
