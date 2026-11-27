/**
 * @file   apps/web/src/App.test.tsx
 * @brief  Tests that the client renders and never decides: it imports no rule layer, and the
 *         result page shows the server's verification as it came, in the kit's result frame.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ResultView } from './screens/Result.js';
import { resultOf } from './testing/views.js';

afterEach(cleanup);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('the client renders, the server decides', () => {
  it('imports neither the domain nor the application layer anywhere', () => {
    const offenders = sources(join(import.meta.dirname, '.')).filter((file) =>
      /from '@sc\/(domain|application)'/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('fills the result frame: headline, placings, proof, reveal and the full list', () => {
    render(<ResultView result={resultOf(true)} call={null} />);
    const frame = screen.getByTestId('result');
    expect(within(frame).getByRole('heading', { level: 1 }).textContent).toBe('The winners');
    const places = frame.querySelector('.sk-result-places');
    expect(places?.textContent).toContain('Prize 1 · GoldHalving StoneAnacase 4');
    // An empty label is not repeated: "Prize 2" once.
    expect(places?.textContent).toContain('Prize 2Season Keybot-9case 9');
    expect(frame.querySelector('.sk-result-proof')?.textContent).toMatch(
      /^sealed at .+ · commitment 0123456789ab · verified$/,
    );
    const reveal = screen.getByRole('list', { name: 'Every case' });
    expect(reveal.querySelectorAll('li')).toHaveLength(3);
    expect(reveal.querySelectorAll('li.is-prize')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'All cases' }).textContent).toContain('bot-5');
  });

  it('offers the way back to the shared call only while one is live (D91)', () => {
    const { rerender } = render(<ResultView result={resultOf(true)} call={null} />);
    expect(screen.queryByTestId('back-to-call')).toBeNull();
    rerender(<ResultView result={resultOf(true)} call={7} />);
    expect(screen.getByTestId('back-to-call').getAttribute('href')).toBe('/calls/7');
  });

  it('does not recompute the verification: an unverified result says so', () => {
    render(<ResultView result={resultOf(false)} call={null} />);
    expect(screen.getByText(/^sealed at/).textContent).toContain('NOT verified');
  });
});
