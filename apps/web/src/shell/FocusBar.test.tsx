/**
 * @file   apps/web/src/shell/FocusBar.test.tsx
 * @brief  Tests the focus bar's panels: a bar button opens its panel, Escape from anywhere on
 *         the page closes it and hands the focus back to the button.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANA, liveView } from '../testing/views.js';
import { FocusBar } from './FocusBar.js';

afterEach(cleanup);

describe('the focus bar panels', () => {
  it('opens the players panel from the bar and closes it on Escape', () => {
    render(
      <FocusBar
        show={liveView('idle')}
        organiser={null}
        me={ANA}
        direct={vi.fn(() => Promise.resolve({ ok: true as const }))}
        target={createRef<HTMLElement>()}
        sound={{ on: false, toggle: vi.fn() }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Players' });
    fireEvent.click(button);
    expect(screen.getByRole('complementary', { name: 'players' })).toBeDefined();
    // From the page, not from inside the panel: the focus may be anywhere.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'players' })).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});
