/**
 * @file   apps/web/src/App.test.tsx
 * @brief  Tests that the client renders and never decides: it imports no rule layer, and the
 *         result screen shows the server's verification as it came.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { ShowResult } from '@sc/contracts';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ResultView } from './screens/Result.js';
import { KEY, LEAF, STONE } from './testing/views.js';

afterEach(cleanup);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const result = (verified: boolean): ShowResult => ({
  winners: [
    { slot: 1, label: 'Gold', artifact: STONE, caseNumber: 4, ownerName: 'Ana' },
    { slot: 2, label: 'Prize 2', artifact: KEY, caseNumber: 9, ownerName: 'bot-9' },
  ],
  cases: [
    { number: 4, ownerName: 'Ana', artifact: STONE },
    { number: 5, ownerName: 'bot-5', artifact: { ...LEAF, id: 'blank-1' } },
    { number: 9, ownerName: 'bot-9', artifact: KEY },
  ],
  sealedAt: '2026-11-21T20:01:00.000Z',
  endedAt: '2026-11-21T20:30:00.000Z',
  commitment: '0123456789abcdef'.repeat(4),
  secret: 'ff'.repeat(32),
  assignment: [],
  verified,
});

describe('the client renders, the server decides', () => {
  it('imports neither the domain nor the application layer anywhere', () => {
    const offenders = sources(join(import.meta.dirname, '.')).filter((file) =>
      /from '@sc\/(domain|application)'/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('shows the winners, then all cases, then the sealing line with the server’s verdict', () => {
    render(<ResultView result={result(true)} />);
    const winners = screen
      .getAllByRole('listitem')
      .slice(0, 2)
      .map((li) => li.textContent);
    expect(winners[0]).toContain('Prize 1GoldHalving StoneAnacase 4');
    expect(screen.getByRole('region', { name: 'All cases' }).textContent).toContain('Fallen Leaf');
    expect(screen.getByText(/^sealed at/).textContent).toMatch(
      /^sealed at .+ · commitment 0123456789ab · verified$/,
    );
  });

  it('does not recompute the verification: an unverified result says so', () => {
    render(<ResultView result={result(false)} />);
    expect(screen.getByText(/^sealed at/).textContent).toContain('NOT verified');
  });
});
