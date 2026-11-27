/**
 * @file   apps/web/src/stage/showRules.test.tsx
 * @brief  Tests the show rules of SC-N4 piece 2 on the client: "End show" asks before an early
 *         end, naming the hidden prizes, and ends at once with none (D33); a case nobody claimed
 *         says "Unclaimed" and its prize "not won" on the stage, the scoreboard, the lower third
 *         and the ceremony (D34).
 */
import type { PublicShowView, ShowResult } from '@sc/contracts';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANA, KEY, liveView, MIA, organiserOf, resultOf, STONE } from '../testing/views.js';
import { Ceremony } from './Ceremony.js';
import { DirectionBar } from './DirectionBar.js';
import { LowerThird } from './LowerThird.js';
import { Stage } from './Stage.js';

afterEach(cleanup);

function bar(show: PublicShowView) {
  const direct = vi.fn(() => Promise.resolve({ ok: true as const }));
  render(<DirectionBar view={organiserOf(show, MIA)} me={MIA} direct={direct} />);
  return direct;
}

/** The live view with case 7 (and with `also`, more cases) unclaimed. */
function unclaimed(show: PublicShowView, also: readonly number[] = []): PublicShowView {
  const none = new Set([7, ...also]);
  return {
    ...show,
    cases: show.cases.map((c) =>
      none.has(c.number)
        ? { ...c, ownerId: null, ownerName: null, ownerSteps: [], ownerRank: null }
        : c,
    ),
  };
}

describe('"End show"', () => {
  it('asks first while prizes are hidden, naming how many', () => {
    const direct = bar(liveView('idle'));
    fireEvent.click(screen.getByRole('button', { name: 'End show' }));
    const question = screen.getByRole('group', { name: 'End the show early?' });
    expect(question.textContent).toContain('2 prizes are still hidden. End the show now?');
    expect(direct).not.toHaveBeenCalled();
    fireEvent.click(within(question).getByRole('button', { name: 'Keep playing' }));
    expect(screen.queryByRole('group', { name: 'End the show early?' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'End show' }));
    fireEvent.click(screen.getByRole('button', { name: 'End now' }));
    expect(direct).toHaveBeenCalledWith('direction:end', { showId: 'show-1' });
  });

  it('says "1 prize is" for one, and ends at once with none hidden', () => {
    bar(liveView('idle', STONE, { 3: STONE }));
    fireEvent.click(screen.getByRole('button', { name: 'End show' }));
    expect(screen.getByRole('group').textContent).toContain('1 prize is still hidden');
    cleanup();
    const found = { ...liveView('idle', STONE, { 3: STONE, 5: KEY }), allPrizesFound: true };
    const direct = bar(found);
    fireEvent.click(screen.getByRole('button', { name: 'End show' }));
    expect(screen.queryByRole('group')).toBeNull();
    expect(direct).toHaveBeenCalledWith('direction:end', { showId: 'show-1' });
  });
});

describe('an unclaimed case', () => {
  it('says "Unclaimed" on the stage and at the owner step', () => {
    const show = unclaimed(liveView('owner'), [2]);
    const direct = vi.fn(() => Promise.resolve({ ok: true as const }));
    render(<Stage show={show} organiser={null} me={ANA} direct={direct} />);
    expect(screen.getByLabelText('Case 2, Unclaimed')).toBeDefined();
    cleanup();
    render(<LowerThird show={show} />);
    const third = screen.getByRole('status');
    expect(third.textContent).toBe('Case 7Unclaimed');
  });

  it('marks its prize "not won" on the scoreboard once taken, and in the ceremony', () => {
    const show = unclaimed(liveView('idle', STONE, { 7: STONE }));
    const direct = vi.fn(() => Promise.resolve({ ok: true as const }));
    render(<Stage show={show} organiser={null} me={ANA} direct={direct} />);
    const taken = screen.getByRole('listitem', { name: /Halving Stone.*taken/ });
    expect(taken.textContent).toContain('not won');
    cleanup();
    const base = resultOf(true);
    const result: ShowResult = {
      ...base,
      winners: base.winners.map((w) => ({ ...w, ownerName: null })),
    };
    render(<Ceremony showId="show-1" result={result} />);
    expect(screen.getByRole('status').textContent).toContain('not won');
  });
});
