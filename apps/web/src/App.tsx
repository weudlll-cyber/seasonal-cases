/**
 * @file   apps/web/src/App.tsx
 * @brief  The client's root: the header or the game bar, and the routes.
 *
 * Responsibility: hold the session and the current show's feed once for the whole page, and
 *                 render the route: the start page (`/`), the stage (`/show`), the result
 *                 (`/results/<id>`), the dev admin (`/admin`). While a live show is on the stage
 *                 the kit's game bar replaces the header (focus mode, ./shell/FocusBar.tsx); on
 *                 a phone the direction bar then lives in the bar's panel. No BackLink yet: it
 *                 comes with website mode.
 * Depends on:     react, @seasonal/kit/react, ./lib/*, ./screens/*, ./shell/*, ./stage/Stage.js
 */
import { useDockView, useTheme } from '@seasonal/kit/react';
import { useRef } from 'react';

import { useCurrentShow, useShowFeed } from './lib/feed.js';
import { routeOf, usePath } from './lib/router.js';
import { useSession } from './lib/session.js';
import { Admin } from './screens/Admin.js';
import { Result } from './screens/Result.js';
import { StartPage } from './screens/StartPage.js';
import { FocusBar } from './shell/FocusBar.js';
import { ShellBar } from './shell/ShellBar.js';
import { Stage } from './stage/Stage.js';

export function App() {
  // The kit's theme hook sets <html data-theme> and follows the system while nothing is stored.
  useTheme();
  const route = routeOf(usePath());
  const session = useSession();
  const current = useCurrentShow();
  const feed = useShowFeed(current.id, session.me);
  const me = session.me ?? null;
  const shellRef = useRef<HTMLDivElement>(null);
  const view = useDockView();
  const show = feed.show;
  const focus = route.name === 'stage' && show?.state === 'live';
  return (
    <div className="shell" ref={shellRef}>
      {focus ? (
        <FocusBar
          show={show}
          moderator={feed.moderator}
          me={me}
          direct={feed.direct}
          target={shellRef}
        />
      ) : (
        <ShellBar
          me={me}
          onSignOut={() => {
            void session.signOut();
          }}
        />
      )}
      {route.name === 'start' && (
        <StartPage me={me} feed={feed} showId={current.id} onSignIn={session.signIn} />
      )}
      {route.name === 'stage' &&
        (show === null ? (
          <p className="page">No show on the stage yet.</p>
        ) : (
          <Stage
            show={show}
            moderator={feed.moderator}
            me={me}
            direct={feed.direct}
            barInline={view === 'desktop'}
          />
        ))}
      {route.name === 'results' && <Result showId={route.showId} />}
      {route.name === 'admin' && <Admin me={me} onShowChanged={current.refresh} />}
    </div>
  );
}
