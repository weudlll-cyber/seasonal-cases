/**
 * @file   apps/web/src/shell/ShellBar.test.tsx
 * @brief  Tests the header on the kit's `AppHeader` (D56, D58): the pages and the marked current
 *         one, the account chip and "Sign out", a guest's "Sign in", website mode's back link
 *         and one sign-in, the development tools only where development is on, a move to
 *         another page without a reload, and the height published for the screens.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ANA } from '../testing/views.js';
import { accountOf, linksOf, ShellBar, type ShellBarProps } from './ShellBar.js';

// jsdom has no matchMedia, which the kit's theme toggle reads: a window that never matches.
beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty('--shell-height');
});

const bar = (more: Partial<ShellBarProps> = {}) => (
  <ShellBar
    route="start"
    me={null}
    website={false}
    dev={false}
    onSignOut={vi.fn(() => Promise.resolve())}
    onDevSignIn={vi.fn(() => Promise.resolve())}
    {...more}
  />
);

describe('the pages', () => {
  it('names the pages, "My matches" only once signed in, and marks the current one', () => {
    expect(linksOf('stage', null).map((l) => l.label)).toEqual([
      'Start',
      'Stage',
      'Chronicle',
      'Admin',
    ]);
    const signedIn = linksOf('matches', ANA);
    expect(signedIn.map((l) => l.label)).toEqual([
      'Start',
      'Stage',
      'Chronicle',
      'My matches',
      'Admin',
    ]);
    expect(signedIn.filter((l) => l.active).map((l) => l.label)).toEqual(['My matches']);
  });

  it('renders them in the main navigation with aria-current on the current page', () => {
    render(bar({ route: 'chronicle' }));
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(screen.getByRole('link', { name: 'Chronicle' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });
});

describe('the account', () => {
  it('shows "name (role)" with the rank of a player, and signs out', () => {
    expect(accountOf(null, vi.fn())).toBeNull();
    const onSignOut = vi.fn(() => Promise.resolve());
    render(bar({ me: ANA, onSignOut }));
    expect(screen.getByTestId('signed-in-as').textContent).toContain('Ana (player · rank 3)');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('shows an organiser without a rank', () => {
    render(bar({ me: { ...ANA, name: 'Olga', role: 'organiser' } }));
    expect(screen.getByTestId('signed-in-as').textContent).toContain('Olga (organiser)');
  });

  it('offers a guest "Sign in" on the start page, and no Register (it is the same page)', () => {
    render(bar());
    expect(screen.getByTestId('sign-in').getAttribute('href')).toBe('/');
    expect(screen.queryByTestId('register')).toBeNull();
    expect(screen.queryByTestId('signed-in-as')).toBeNull();
  });
});

describe('the dev tools', () => {
  it('shows the Quick Test link and the Dev sign-in menu where development is on', async () => {
    const onDevSignIn = vi.fn(() => Promise.resolve());
    render(bar({ dev: true, onDevSignIn }));
    expect(await screen.findByRole('link', { name: 'Quick Test' })).toBeDefined();
    fireEvent.click(await screen.findByRole('button', { name: /Dev sign-in/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign in as organiser' }));
    expect(onDevSignIn).toHaveBeenCalledWith({ name: 'Olga', role: 'organiser', rank: 0 });
  });

  it('shows neither without the server’s development flag', () => {
    render(bar({ dev: false }));
    expect(screen.queryByRole('link', { name: 'Quick Test' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Dev sign-in/ })).toBeNull();
  });
});

describe('website mode', () => {
  it('has the way back and one "Sign in" through the website, and no dev menu', () => {
    render(bar({ website: true, dev: true }));
    expect(screen.getByRole('link', { name: /^Seasonal Entertainment$/ })).toBeDefined();
    const signIn = screen.getByTestId('sign-in');
    expect(signIn.getAttribute('href')).toContain('auth/website');
    expect(screen.queryByRole('button', { name: /Dev sign-in/ })).toBeNull();
  });
});

describe('moving between pages', () => {
  it('follows one of its own pages without a reload, and leaves a modified click alone', () => {
    const push = vi.spyOn(window.history, 'pushState');
    render(bar());
    const link = screen.getByRole('link', { name: 'Chronicle' });
    fireEvent.click(link);
    expect(push).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/chronicle');
    // A ctrl-click opens a tab in the browser's own way.
    fireEvent.click(link, { ctrlKey: true });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('does not take the website’s login hop for one of its own pages', () => {
    const push = vi.spyOn(window.history, 'pushState');
    render(bar({ website: true }));
    // jsdom refuses a real navigation ("not implemented"): the click only has to be left alone.
    const signIn = screen.getByTestId('sign-in');
    signIn.addEventListener('click', (event) => {
      event.preventDefault();
    });
    fireEvent.click(signIn);
    expect(push).not.toHaveBeenCalled();
  });
});

describe('the published height', () => {
  it('measures the kit header, not the wrapper, and removes the property with the header', () => {
    const observed: Element[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(el: Element): void {
          observed.push(el);
        }
        disconnect(): void {}
      },
    );
    const { unmount } = render(bar());
    // The kit's fold observes too: the header must be among them, the box-less wrapper not.
    expect(observed.some((el) => el.className === 'sk-header')).toBe(true);
    expect(observed.some((el) => el.className === 'shell-header')).toBe(false);
    unmount();
    expect(document.documentElement.style.getPropertyValue('--shell-height')).toBe('');
  });
});
