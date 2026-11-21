/**
 * @file   apps/web/src/App.tsx
 * @brief  The client's root: the header or the game bar, the docked chat, and the routes.
 *
 * Responsibility: hold the session, the server's mode and the current show's feed once for the
 *                 whole page, and render the route: the start page (`/`), the stage (`/show`),
 *                 the result (`/results/<id>`), the admin (`/admin`). While a live show is on the
 *                 stage the kit's game bar replaces the header (focus mode); on a phone the
 *                 direction bar then lives in the bar's panel. In website mode, or locally with a
 *                 chat origin, every screen sits in the kit's `DockedScreen` with the website's
 *                 chat, mounted once (GAME-INTEGRATION §5); the call slot stays hidden.
 * Depends on:     react, @seasonal/kit/react, @sc/ui, ./lib/*, ./screens/*, ./shell/*,
 *                 ./stage/Stage.js
 */
import { DockedScreen, useDockView, useTheme, WebsiteChatFrame } from '@seasonal/kit/react';
import { OriginChatFrame } from '@sc/ui';
import { useRef, type ReactNode } from 'react';

import { useCurrentShow, useShowFeed } from './lib/feed.js';
import { docked, useServerMode, type ServerMode } from './lib/mode.js';
import { routeOf, usePath, type Route } from './lib/router.js';
import { useSession } from './lib/session.js';
import { Admin } from './screens/Admin.js';
import { Result } from './screens/Result.js';
import { StartPage } from './screens/StartPage.js';
import { FocusBar } from './shell/FocusBar.js';
import { ShellBar } from './shell/ShellBar.js';
import { Stage } from './stage/Stage.js';

const ROOM = 'cases';

function chatOf(mode: ServerMode): ReactNode {
  if (mode.mode === 'website') return <WebsiteChatFrame room={ROOM} sandboxed />;
  return mode.chatOrigin === null ? null : <OriginChatFrame origin={mode.chatOrigin} room={ROOM} />;
}

export function App() {
  // The kit's theme hook sets <html data-theme> and follows the system while nothing is stored.
  useTheme();
  const route = routeOf(usePath());
  const session = useSession();
  const mode = useServerMode();
  const current = useCurrentShow();
  const feed = useShowFeed(current.id, session.me);
  const me = session.me ?? null;
  const shellRef = useRef<HTMLDivElement>(null);
  const view = useDockView();
  const show = feed.show;
  const focus = route.name === 'stage' && show?.state === 'live';
  const isDocked = docked(mode);
  const content = (
    <Routes
      route={route}
      me={me}
      mode={mode}
      feed={feed}
      current={current}
      session={session}
      phone={view !== 'desktop'}
    />
  );
  return (
    <div className="shell" ref={shellRef} data-docked={isDocked}>
      {focus ? (
        <FocusBar
          show={show}
          organiser={feed.organiser}
          me={me}
          direct={feed.direct}
          target={shellRef}
        />
      ) : (
        <ShellBar
          me={me}
          website={mode.mode === 'website'}
          onSignOut={() => {
            void session.signOut();
          }}
        />
      )}
      {isDocked ? (
        <DockedScreen chat={chatOf(mode)} bar="line" callId={null}>
          {content}
        </DockedScreen>
      ) : (
        content
      )}
    </div>
  );
}

interface RoutesProps {
  readonly route: Route;
  readonly me: ReturnType<typeof useSession>['me'];
  readonly mode: ServerMode;
  readonly feed: ReturnType<typeof useShowFeed>;
  readonly current: ReturnType<typeof useCurrentShow>;
  readonly session: ReturnType<typeof useSession>;
  readonly phone: boolean;
}

function Routes({ route, me, mode, feed, current, session, phone }: RoutesProps) {
  const signedIn = me ?? null;
  const show = feed.show;
  if (route.name === 'stage') {
    if (show === null) return <p className="page">No show on the stage yet.</p>;
    return (
      <Stage
        show={show}
        organiser={feed.organiser}
        me={signedIn}
        direct={feed.direct}
        barInline={!phone}
      />
    );
  }
  if (route.name === 'results') return <Result showId={route.showId} />;
  if (route.name === 'admin') {
    return <Admin me={signedIn} onShowChanged={current.refresh} dev={mode.dev} />;
  }
  return (
    <StartPage
      me={signedIn}
      mode={mode}
      feed={feed}
      showId={current.id}
      onSignIn={session.signIn}
    />
  );
}
