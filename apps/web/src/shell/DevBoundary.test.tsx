/**
 * @file   apps/web/src/shell/DevBoundary.test.tsx
 * @brief  Tests the dev boundary: a tool that throws renders nothing and the rest of the page
 *         stays; a tool that does not throw is shown.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DevBoundary } from './DevBoundary.js';

afterEach(cleanup);

function Throws(): never {
  throw new Error('a dev tool failed');
}

describe('the dev boundary', () => {
  it('shows a tool that works', () => {
    render(
      <DevBoundary>
        <button type="button">Dev tool</button>
      </DevBoundary>,
    );
    expect(screen.getByRole('button', { name: 'Dev tool' })).toBeDefined();
  });

  it('renders nothing for a tool that throws, and leaves the page around it', () => {
    // React logs the error it hands to the boundary; the test only needs the outcome.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <main>
        <p>the page</p>
        <DevBoundary>
          <Throws />
        </DevBoundary>
      </main>,
    );
    expect(screen.getByText('the page')).toBeDefined();
    expect(screen.getByRole('main').children).toHaveLength(1);
    vi.restoreAllMocks();
  });
});
