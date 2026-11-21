/**
 * @file   apps/web/src/shell/ShellBar.tsx
 * @brief  The app header outside focus mode: the way back to the website, the name, the
 *         navigation, the user, the theme.
 *
 * Responsibility: one row on a desktop, two on a phone (./shell.css); the kit's `BackLink`
 *                 ("← Seasonal Entertainment", website mode only, GAME-INTEGRATION §8) at the
 *                 top left and the kit's `ThemeToggle`. In website mode a guest's "Sign in" goes
 *                 through the website (the kit's `websiteLoginHref` to the game's login hop) and
 *                 back to this page. Hidden while a live show is on the stage: the game bar takes
 *                 its place (./FocusBar.tsx).
 * Depends on:     @seasonal/kit, @seasonal/kit/react, @sc/contracts (types), ../lib/base.js,
 *                 ../lib/router.js, ../stage/Badges.js
 */
import { websiteLoginHref } from '@seasonal/kit';
import { BackLink, ThemeToggle } from '@seasonal/kit/react';
import type { Me } from '@sc/contracts';

import { BASE } from '../lib/base.js';
import { Link } from '../lib/router.js';
import { Badges } from '../stage/Badges.js';

export interface ShellBarProps {
  readonly me: Me | null;
  readonly website: boolean;
  readonly onSignOut: () => void;
}

export function ShellBar({ me, website, onSignOut }: ShellBarProps) {
  return (
    <header className="shell-bar">
      <BackLink websiteMode={website} />
      <Link to="/" className="shell-title">
        Seasonal Cases
      </Link>
      <nav className="shell-nav" aria-label="Main">
        <Link to="/">Start</Link>
        <Link to="/show">Stage</Link>
        {me !== null && <Link to="/matches">My matches</Link>}
        <Link to="/admin">Admin</Link>
      </nav>
      {me === null && website && (
        <a
          className="button"
          href={websiteLoginHref(`${BASE}auth/website`)}
          title="Sign in with your Seasonal Entertainment account"
        >
          Sign in
        </a>
      )}
      {me !== null && (
        <span className="shell-me">
          <Badges badges={me.badges} />
          <span className="shell-me-name" title={me.name}>
            {me.name}
          </span>
          <span className="shell-me-role">
            · {me.role}
            {me.role === 'player' ? ` · rank ${String(me.rank)}` : ''}
          </span>
          <button type="button" className="button" title="Sign out" onClick={onSignOut}>
            Sign out
          </button>
        </span>
      )}
      <ThemeToggle />
    </header>
  );
}
