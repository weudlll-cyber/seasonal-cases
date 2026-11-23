/**
 * @file   apps/web/src/shell/FocusBar.test.tsx
 * @brief  Tests the focus bar's panels: a bar button opens its panel, Escape from anywhere on
 *         the page closes it and hands the focus back to the button; the sound is the kit's
 *         toggle; the chat button carries the dock's unread count and opens the dock's chat.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANA, liveView } from '../testing/views.js';
import { FocusBar, type FocusBarProps } from './FocusBar.js';

afterEach(cleanup);

const bar = (more: Partial<FocusBarProps> = {}) => (
  <FocusBar
    show={liveView('idle')}
    organiser={null}
    me={ANA}
    direct={vi.fn(() => Promise.resolve({ ok: true as const }))}
    target={createRef<HTMLElement>()}
    sound={{ on: false, toggle: vi.fn() }}
    {...more}
  />
);

describe('the focus bar panels', () => {
  it('opens the players panel from the bar and closes it on Escape', () => {
    render(bar());
    const button = screen.getByRole('button', { name: 'Players' });
    fireEvent.click(button);
    expect(screen.getByRole('complementary', { name: 'players' })).toBeDefined();
    // From the page, not from inside the panel: the focus may be anywhere.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'players' })).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('switches the sound with the kit toggle, which says whether it is on', () => {
    const toggle = vi.fn();
    const { rerender } = render(bar({ sound: { on: false, toggle } }));
    const sound = screen.getByRole('button', { name: 'Sound' });
    expect(sound.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(sound);
    expect(toggle).toHaveBeenCalledTimes(1);
    rerender(bar({ sound: { on: true, toggle } }));
    expect(screen.getByRole('button', { name: 'Sound' }).getAttribute('aria-pressed')).toBe('true');
  });

  it("shows the dock's unread count on its chat button and opens the dock's chat", () => {
    // The kit's phone chat bar, as the dock renders it below the screens.
    const dockBar = document.createElement('button');
    dockBar.className = 'sk-chat-bar';
    const opened = vi.fn();
    dockBar.addEventListener('click', opened);
    document.body.append(dockBar);
    render(bar({ chat: { unread: 3 } }));
    const chat = screen.getByRole('button', { name: /Chat/ });
    expect(chat.textContent).toContain('3');
    fireEvent.click(chat);
    expect(opened).toHaveBeenCalledTimes(1);
    // No second chat in a panel of the bar.
    expect(screen.queryByRole('complementary', { name: 'chat' })).toBeNull();
    // An open sheet stays open: the dock's bar toggles, so it is not pressed again.
    dockBar.setAttribute('aria-expanded', 'true');
    fireEvent.click(chat);
    expect(opened).toHaveBeenCalledTimes(1);
    dockBar.remove();
  });

  it('has no chat button where the screens are not docked', () => {
    render(bar());
    expect(screen.queryByRole('button', { name: /Chat/ })).toBeNull();
  });
});
