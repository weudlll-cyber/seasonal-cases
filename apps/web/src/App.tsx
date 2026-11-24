/**
 * @file   apps/web/src/App.tsx
 * @brief  The client's root: the header or the game bar, the docked chat, and the routes.
 *
 * Responsibility: hold the session, the server's mode and the current show's feed once for the
 *                 whole page, and render the route: the start page (`/`), the stage (`/show`),
 *                 the result (`/results/<id>`), the admin (`/admin`), "My matches" (`/matches`),
 *                 the chronicle (`/chronicle`), the forgotten password's page (`/reset`), the
 *                 registration's confirmation (`/confirm`) and, in development only, the
 *                 opening's showcase (`/dev/opening`). While a live show is on the
 *                 stage the kit's game bar replaces the header (focus mode); on a phone the
 *                 direction bar then lives in the bar's panel. In website mode, or locally with a
 *                 chat origin, every screen sits in the kit's `DockedScreen` with the website's
 *                 chat, mounted once (GAME-INTEGRATION §5); the call slot stays hidden. The
 *                 dock's unread count (the kit's `onUnread`) is the game bar's chat badge. The kit's
 *                 theme hook sets <html data-theme> and follows the system while nothing is stored.
 * Depends on:     react, @seasonal/kit/react, ./account/*, ./lib/*, ./screens/*, ./shell/*,
 *                 ./stage/Stage.js
 */
import {
  DockedScreen,
  OriginChatFrame,
  useDockView,
  useTheme,
  WebsiteChatFrame,
} from '@seasonal/kit/react';
import { useRef, type ReactNode } from 'react';

import { ConfirmPage } from './account/ConfirmPage.js';
import { Matches } from './account/Matches.js';
import { ResetPage } from './account/ResetPage.js';
import { useCurrentShow, useShowFeed } from './lib/feed.js';
import { docked, useServerMode, type ServerMode } from './lib/mode.js';
import { routeOf, usePath, type Route } from './lib/router.js';
import { useSession } from './lib/session.js';
import { Admin } from './screens/Admin.js';
import { Chronicle } from './screens/Chronicle.js';
import { OpeningShowcase } from './screens/OpeningShowcase.js';
import { Result } from './screens/Result.js';
import { StartPage } from './screens/StartPage.js';
import { DockChatBridge, useDockChat } from './shell/DockChatBridge.js';
import { FocusBar } from './shell/FocusBar.js';
import { ShellBar } from './shell/ShellBar.js';
import { useSound } from './stage/sound.js';
import { Stage } from './stage/Stage.js';

const ROOM = 'cases';

function chatOf(mode: ServerMode): ReactNode {
  if (mode.mode === 'website') return <WebsiteChatFrame room={ROOM} />;
  return mode.chatOrigin === null ? null : <OriginChatFrame origin={mode.chatOrigin} room={ROOM} />;
}

export function App() {
  useTheme();
  const route = routeOf(usePath());
  const session = useSession();
  const mode = useServerMode();
  const current = useCurrentShow(route.name === 'stage');
  const feed = useShowFeed(current.id, session.me);
  // Here, not in the game bar: the ceremony's applause plays after the bar has gone.
  const sound = useSound(feed.show);
  const me = session.me ?? null;
  const shellRef = useRef<HTMLDivElement>(null);
  const view = useDockView();
  const show = feed.show;
  const focus = route.name === 'stage' && show?.state === 'live';
  const isDocked = docked(mode);
  const dock = useDockChat();
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
          sound={sound}
          chat={isDocked ? dock.chat : undefined}
        />
      ) : (
        <ShellBar
          route={route.name}
          me={me}
          website={mode.mode === 'website'}
          dev={mode.dev}
          onSignOut={session.signOut}
          onDevSignIn={session.signIn}
        />
      )}
      {isDocked ? (
        <DockedScreen chat={chatOf(mode)} bar="line" callId={null} onUnread={dock.onUnread}>
          <DockChatBridge into={dock.into} />
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
        applause={feed.applause}
      />
    );
  }
  if (route.name === 'results') return <Result showId={route.showId} />;
  if (route.name === 'matches') return <Matches me={signedIn} />;
  if (route.name === 'chronicle') return <Chronicle />;
  if (route.name === 'reset') return <ResetPage />;
  if (route.name === 'confirm') return <ConfirmPage />;
  if (route.name === 'opening') return <OpeningShowcase dev={mode.dev} />;
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
      onEnter={session.enter}
    />
  );
}
