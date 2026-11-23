/**
 * @file   apps/web/src/board/RegistrationBoard.test.tsx
 * @brief  Tests the registration board: the conflict view and the "your rank is higher /
 *         lower" hint, the pick line, and the click that claims.
 */
import type { PersonalView } from '@sc/contracts';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registrationView } from '../testing/views.js';
import { RegistrationBoard } from './RegistrationBoard.js';

afterEach(cleanup);

const card = (n: number) => {
  const li = document.querySelector(`[data-case="${String(n)}"]`);
  if (!(li instanceof HTMLElement)) throw new Error(`no case ${String(n)}`);
  return li;
};

/** Ana (rank 3) picked case 7, which Bo (rank 4) holds. */
const personal: PersonalView = {
  showId: 'show-1',
  claim: 7,
  holds: false,
  standings: Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    standing: i + 1 === 7 ? 'lower' : i + 1 === 8 ? 'higher' : 'free',
  })),
};

describe('RegistrationBoard', () => {
  it('shows the holder of a case and every other claimant with rank', () => {
    render(<RegistrationBoard show={registrationView()} personal={null} />);
    expect(card(7).textContent).toContain('Bo rank 4');
    expect(card(7).textContent).toMatch(/also: Ana \(rank 3, .+\)/);
    expect(card(1).textContent).toContain('free');
  });

  it('tells a player where their rank stands, and that their pick does not hold', () => {
    render(<RegistrationBoard show={registrationView()} personal={personal} onClaim={vi.fn()} />);
    expect(within(card(7)).getByText('Your rank is lower: the holder keeps it')).toBeDefined();
    expect(within(card(8)).getByText('Your rank is higher: you would take it')).toBeDefined();
    expect(within(card(1)).getByText('Free: you would take it')).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain(
      'Your pick: case 7, someone with a higher rank',
    );
  });

  it('claims a case with one click, and shows the server’s refusal', () => {
    const onClaim = vi.fn();
    render(
      <RegistrationBoard
        show={registrationView()}
        personal={personal}
        onClaim={onClaim}
        error="registration is not open"
      />,
    );
    fireEvent.click(within(card(8)).getByRole('button'));
    expect(onClaim).toHaveBeenCalledWith(8);
    expect(screen.getByRole('alert').textContent).toBe('registration is not open');
  });

  it('offers no click to a guest or an organiser', () => {
    render(<RegistrationBoard show={registrationView()} personal={null} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
