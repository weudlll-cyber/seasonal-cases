/**
 * @file   apps/web/src/shell/ShellBar.tsx
 * @brief  The app header outside focus mode: the name, the navigation, the user, the theme.
 *
 * Responsibility: one row on a desktop, two on a phone (./shell.css); the kit's `ThemeToggle`.
 *                 Hidden while a live show is on the stage: the game bar takes its place
 *                 (./FocusBar.tsx).
 * Depends on:     @seasonal/kit/react, @sc/contracts (types), ../lib/router.js
 */
import { ThemeToggle } from '@seasonal/kit/react';
import type { Me } from '@sc/contracts';

import { Link } from '../lib/router.js';

export function ShellBar({ me, onSignOut }: { me: Me | null; onSignOut: () => void }) {
  return (
    <header className="shell-bar">
      <Link to="/" className="shell-title">
        Seasonal Cases
      </Link>
      <nav className="shell-nav" aria-label="Main">
        <Link to="/">Start</Link>
        <Link to="/show">Stage</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      {me !== null && (
        <span className="shell-me">
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
