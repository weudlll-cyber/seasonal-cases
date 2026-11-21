/**
 * @file   apps/web/src/App.tsx
 * @brief  The client's root: the shell bar and the four routes.
 *
 * Responsibility: hold the session and the current show's feed once for the whole page, and
 *                 render the route: the lobby (`/`), the stage (`/show`), the result
 *                 (`/results/<id>`), the dev admin (`/admin`). The shell bar has the show's name,
 *                 the navigation, the signed-in user and the kit's `ThemeToggle`. No BackLink:
 *                 the prototype runs standalone (CONCEPT §10).
 * Depends on:     react, @seasonal/kit/react, ./lib/*, ./screens/*, ./stage/Stage.js
 */
import { ThemeToggle, useTheme } from '@seasonal/kit/react';

import { useCurrentShow, useShowFeed } from './lib/feed.js';
import { Link, routeOf, usePath } from './lib/router.js';
import { useSession } from './lib/session.js';
import { Admin } from './screens/Admin.js';
import { Lobby } from './screens/Lobby.js';
import { Result } from './screens/Result.js';
import { Stage } from './stage/Stage.js';

export function App() {
  // The kit's theme hook sets <html data-theme> and follows the system while nothing is stored.
  useTheme();
  const path = usePath();
  const route = routeOf(path);
  const session = useSession();
  const current = useCurrentShow();
  const showId = current.id;
  const feed = useShowFeed(showId, session.me);
  const me = session.me ?? null;
  return (
    <div className="shell">
      <header className="shell-bar">
        <Link to="/" className="shell-title">
          Seasonal Cases
        </Link>
        <nav className="shell-nav" aria-label="Main">
          <Link to="/">Lobby</Link>
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
            <button
              type="button"
              className="button"
              title="Sign out"
              onClick={() => {
                void session.signOut();
              }}
            >
              Sign out
            </button>
          </span>
        )}
        <ThemeToggle />
      </header>
      {route.name === 'lobby' && (
        <Lobby me={me} feed={feed} showId={showId} onSignIn={session.signIn} />
      )}
      {route.name === 'stage' &&
        (feed.show === null ? (
          <p className="page">No show on the stage yet.</p>
        ) : (
          <Stage show={feed.show} moderator={feed.moderator} me={me} direct={feed.direct} />
        ))}
      {route.name === 'results' && <Result showId={route.showId} />}
      {route.name === 'admin' && <Admin me={me} onShowChanged={current.refresh} />}
    </div>
  );
}
