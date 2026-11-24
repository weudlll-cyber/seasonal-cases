/**
 * @file   apps/web/src/App.tsx
 * @brief  The client's root: the header or the game bar, the docked chat, and the routes.
 *
 * Responsibility: hold the session, the server's mode and the current show's feed once for the
 *                 whole page, and render the route: the start page (`/`), the stage (`/show`),
 *                 the result (`/results/<id>`), the admin (`/admin`), "My matches" (`/matches`),
 *                 the account (`/account`, download and delete), the privacy page (`/privacy`),
 *                 the chronicle (`/chronicle`), the forgotten password's page (`/reset`), the
 *                 registration's confirmation (`/confirm`) and, in development only, the
 *                 opening's showcase (`/dev/opening`). While a live show is on the
 *                 stage the kit's game bar replaces the header (focus mode), keeping the way back
 *                 to Seasonal Entertainment in website mode; on a phone the direction bar then
 *                 lives in the bar's panel. Every screen sits in the kit's `DockedScreen`: in
 *                 website mode, or locally with a chat origin, with the chat, mounted once
 *                 (GAME-INTEGRATION §5), the call slot hidden; with no chat as `withoutChat`,
 *                 which still keeps the page above the phone's keyboard (D62). The
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

import { AccountPage } from './account/AccountPage.js';
import { ConfirmPage } from './account/ConfirmPage.js';
import { Matches } from './account/Matches.js';
import { ResetPage } from './account/ResetPage.js';
import { useCurrentShow, useShowFeed } from './lib/feed.js';
import { useServerMode, type ServerMode } from './lib/mode.js';
import { routeOf, usePath, type Route } from './lib/router.js';
import { useSession } from './lib/session.js';
import { Admin } from './screens/Admin.js';
import { Chronicle } from './screens/Chronicle.js';
import { OpeningShowcase } from './screens/OpeningShowcase.js';
import { PrivacyPage } from './screens/PrivacyPage.js';
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

/**
 * Every route sits in the kit's DockedScreen: with the chat where there is one, otherwise
 * `withoutChat` (a standalone install): no dock, and the page still follows the phone's keyboard.
 */
function Screen(props: {
  chat: ReactNode;
  dock: ReturnType<typeof useDockChat>;
  children: ReactNode;
}) {
  const { chat, dock, children } = props;
  if (chat === null) return <DockedScreen withoutChat>{children}</DockedScreen>;
  return (
    <DockedScreen chat={chat} bar="line" callId={null} onUnread={dock.onUnread}>
      <DockChatBridge into={dock.into} />
      {children}
    </DockedScreen>
  );
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
  const dock = useDockChat();
  const chat = chatOf(mode);
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
    <div className="shell" ref={shellRef}>
      {focus ? (
        <FocusBar
          show={show}
          organiser={feed.organiser}
          me={me}
          direct={feed.direct}
          target={shellRef}
          sound={sound}
          website={mode.mode === 'website'}
          chat={chat === null ? undefined : dock.chat}
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
      <Screen chat={chat} dock={dock}>
        {content}
      </Screen>
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

/** The pages that need no feed: the result, the account area, the chronicle, the mail links. */
function plainPage(
  route: Route,
  mode: ServerMode,
  session: ReturnType<typeof useSession>,
): ReactNode {
  const me = session.me ?? null;
  const website = mode.mode === 'website';
  if (route.name === 'results') return <Result showId={route.showId} />;
  if (route.name === 'matches') return <Matches me={me} />;
  if (route.name === 'account') {
    return <AccountPage me={me} website={website} onGone={session.signOut} />;
  }
  if (route.name === 'privacy')
    return <PrivacyPage website={website} contact={mode.privacyContact} />;
  if (route.name === 'chronicle') return <Chronicle />;
  if (route.name === 'reset') return <ResetPage />;
  if (route.name === 'confirm') return <ConfirmPage />;
  if (route.name === 'opening') return <OpeningShowcase dev={mode.dev} />;
  return null;
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
  const plain = plainPage(route, mode, session);
  if (plain !== null) return plain;
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
