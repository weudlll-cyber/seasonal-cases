/**
 * @file   apps/web/src/screens/OpeningShowcase.test.tsx
 * @brief  Tests the opening's showcase (`/dev/opening`): not there outside development; in
 *         development a closed case until "Play the opening", then the opening with its artifact.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { routeOf } from '../lib/router.js';
import { OpeningShowcase } from './OpeningShowcase.js';

afterEach(cleanup);

describe('the opening showcase', () => {
  it('is a route of its own', () => {
    expect(routeOf('/dev/opening')).toEqual({ name: 'opening' });
  });

  it('is not there outside development', () => {
    const { container } = render(<OpeningShowcase dev={false} />);
    expect(container.textContent).toBe('This page does not exist.');
    expect(container.querySelector('.case-picture')).toBeNull();
  });

  it('shows the closed case first, and plays the opening on the button', () => {
    const { container } = render(<OpeningShowcase dev />);
    const front = () => container.querySelector('.centre .case-picture');
    expect(front()?.getAttribute('data-state')).toBe('closed');
    expect(container.querySelector('.centre .artifact')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Play the opening' }));
    expect(front()?.getAttribute('data-state')).toBe('opening');
    expect(container.querySelector('.centre .artifact')).not.toBeNull();
    expect(container.querySelector('.centre-meaning')?.textContent).toBe('Prize 1 · Gold');
  });
});
