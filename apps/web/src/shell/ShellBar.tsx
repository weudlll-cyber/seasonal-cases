/**
 * @file   apps/web/src/shell/ShellBar.tsx
 * @brief  The app header outside focus mode: the kit's `AppHeader` with this game's links,
 *         account and development tools (DECISIONS D56, D58).
 *
 * Responsibility: the kit's order, on screen and in the DOM: in website mode the way back to
 *                 Seasonal Entertainment, the brand (emblem, "Seasonal Cases"), the pages (Start,
 *                 Stage, Chronicle, "My matches" once signed in, Admin, Privacy; the current one marked),
 *                 the account chip "name (role)", linking to the account page (download and delete
 *                 one's data, D61), with "Sign out" (a guest: "Sign in", which in
 *                 website mode goes through the website with the kit's `websiteLoginHref` to the
 *                 game's login hop), in development the Quick Test link and the "Dev sign-in"
 *                 menu (./DevTools.tsx, loaded only by a development build, each inside an error
 *                 boundary: ./DevBoundary.tsx), and the theme toggle
 *                 at the far right. When the items do not fit one row, the kit folds the pages and
 *                 the account into one "Menu" button. The kit renders plain anchors; a click on
 *                 one of this game's own pages moves without a reload (the delegated handler
 *                 below). The header's height is published for the screens that subtract it
 *                 (./useShellHeight.ts). Hidden while a live show is on the stage: the game bar
 *                 takes its place (./FocusBar.tsx).
 * Depends on:     react, @seasonal/kit, @seasonal/kit/react, @sc/contracts (types),
 *                 assets/brand/emblem.webp, ../lib/base.js, ../lib/router.js,
 *                 ./DevBoundary.js, ./DevTools.js (lazy, development only), ./useShellHeight.js
 */
import { websiteLoginHref } from '@seasonal/kit';
import { AppHeader, type HeaderAccount, type HeaderLink } from '@seasonal/kit/react';
import type { Me, SignInRequest } from '@sc/contracts';
import { lazy, Suspense, useRef, type MouseEvent, type ReactElement } from 'react';

import emblem from '../../../../assets/brand/emblem.webp';
import { appPathOf, BASE, pagePath } from '../lib/base.js';
import { navigate, type Route } from '../lib/router.js';
import { DevBoundary } from './DevBoundary.js';
import { useShellHeight } from './useShellHeight.js';

// Development tools load on demand. A production build replaces import.meta.env.DEV with false,
// so these imports and everything behind them stay out of the bundle (kit HANDBOOK, security).
const QuickTestLink = import.meta.env.DEV
  ? lazy(() => import('./DevTools.js').then((m) => ({ default: m.QuickTestLink })))
  : null;
const DevSignIn = import.meta.env.DEV
  ? lazy(() => import('./DevTools.js').then((m) => ({ default: m.DevSignIn })))
  : null;

export interface ShellBarProps {
  readonly route: Route['name'];
  readonly me: Me | null;
  readonly website: boolean;
  // Development: the server's dev features are on (the quick tools show only in a dev build too).
  readonly dev: boolean;
  readonly onSignOut: () => Promise<void>;
  readonly onDevSignIn: (request: SignInRequest) => Promise<void>;
}

/** The pages of the bar; the server checks every call behind them. */
export function linksOf(route: Route['name'], me: Me | null): readonly HeaderLink[] {
  const link = (to: string, label: string, active: boolean): HeaderLink => ({
    href: pagePath(to),
    label,
    active,
  });
  return [
    link('/', 'Start', route === 'start'),
    link('/show', 'Stage', route === 'stage'),
    link('/chronicle', 'Chronicle', route === 'chronicle'),
    ...(me === null ? [] : [link('/matches', 'My matches', route === 'matches')]),
    link('/admin', 'Admin', route === 'admin'),
    link('/privacy', 'Privacy', route === 'privacy'),
  ];
}

/** The signed-in account as the chip shows it: "Ana (player · rank 2)", "Olga (organiser)". */
export function accountOf(me: Me | null, onSignOut: () => void): HeaderAccount | null {
  if (me === null) return null;
  const role = me.role === 'player' ? `player · rank ${String(me.rank)}` : me.role;
  return { name: me.name, role, href: pagePath('/account'), onSignOut };
}

// A plain left click: no modifier key, which opens a tab or a window in the browser's own way.
const plain = (event: MouseEvent): boolean =>
  event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);

/**
 * A click on one of the game's own pages moves without a reload. The kit's header renders plain
 * anchors; the paths named here are this bar's own, so the website's login hop and anything else
 * the browser follows as it is.
 */
function inAppClick(paths: ReadonlySet<string>): (event: MouseEvent) => void {
  return (event) => {
    if (event.defaultPrevented || !plain(event)) return;
    const anchor = event.target instanceof Element ? event.target.closest('a') : null;
    if (anchor === null || !paths.has(anchor.pathname)) return;
    event.preventDefault();
    navigate(appPathOf(anchor.pathname));
  };
}

export function ShellBar({ route, me, website, dev, onSignOut, onDevSignIn }: ShellBarProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  useShellHeight(wrapper);
  const links = linksOf(route, me);
  const own = new Set([pagePath('/'), pagePath('/account'), ...links.map((l) => l.href)]);
  const quick = dev && QuickTestLink !== null;
  return (
    // The wrapper has no box (display: contents): the header stays a child of the page, sticky.
    <div className="shell-header" ref={wrapper} onClick={inAppClick(own)}>
      <AppHeader
        websiteMode={website}
        brand={{
          href: pagePath('/'),
          emblem: <img src={emblem} alt="" width="42" height="37" />,
          name: 'Seasonal Cases',
        }}
        links={links}
        navExtra={quick ? <QuickTestSlot /> : null}
        account={accountOf(me, () => {
          void onSignOut();
        })}
        signIn={{ href: website ? websiteLoginHref(`${BASE}auth/website`) : pagePath('/') }}
        devTools={
          dev && DevSignIn !== null && !website ? <DevSignInSlot onSignIn={onDevSignIn} /> : null
        }
        // A new page or another account: the folded menu has done its job.
        closeKey={`${route} ${me?.name ?? ''}`}
        buttonClassName="button"
      />
    </div>
  );
}

function QuickTestSlot(): ReactElement | null {
  if (QuickTestLink === null) return null;
  return (
    <DevBoundary>
      <Suspense fallback={null}>
        <QuickTestLink />
      </Suspense>
    </DevBoundary>
  );
}

function DevSignInSlot(props: {
  onSignIn: (request: SignInRequest) => Promise<void>;
}): ReactElement | null {
  if (DevSignIn === null) return null;
  return (
    <DevBoundary>
      <Suspense fallback={null}>
        <DevSignIn onSignIn={props.onSignIn} />
      </Suspense>
    </DevBoundary>
  );
}
