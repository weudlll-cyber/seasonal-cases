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
 *                 (GAME-INTEGRATION §5); with no chat as `withoutChat`, which still keeps the
 *                 page above the phone's keyboard (D62). In website mode only, the dock's slot
 *                 holds the website's one shared call, shown while it is live (D91), and its id
 *                 goes to the result's way back; standalone frames no call. The
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
import { lazy, Suspense, useRef, useState, type ReactNode } from 'react';

import { AccountPage } from './account/AccountPage.js';
import { ConfirmPage } from './account/ConfirmPage.js';
import { Matches } from './account/Matches.js';
import { ResetPage } from './account/ResetPage.js';
import { devSignInOf } from './lib/devSignIn.js';
import { useCurrentShow, useShowFeed } from './lib/feed.js';
import { useServerMode, type ServerMode } from './lib/mode.js';
import { routeOf, usePath, type Route } from './lib/router.js';
import { useSession } from './lib/session.js';
import { Admin } from './screens/Admin.js';
import { Chronicle } from './screens/Chronicle.js';
import { PrivacyPage } from './screens/PrivacyPage.js';
import { Result } from './screens/Result.js';
import { StartPage } from './screens/StartPage.js';
import { DevBoundary } from './shell/DevBoundary.js';
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
  // Website mode: hears the live shared call's id; absent, the dock frames no shared call.
  onSharedCall: ((callId: number | null) => void) | undefined;
  children: ReactNode;
}) {
  const { chat, dock, onSharedCall, children } = props;
  if (chat === null) return <DockedScreen withoutChat>{children}</DockedScreen>;
  return (
    <DockedScreen
      chat={chat}
      bar="line"
      callId={null}
      onUnread={dock.onUnread}
      onSharedCall={onSharedCall}
    >
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
  // The live shared call's id, or null (website mode only).
  const [call, setCall] = useState<number | null>(null);
  const content = (
    <Routes
      route={route}
      me={me}
      mode={mode}
      feed={feed}
      current={current}
      session={session}
      phone={view !== 'desktop'}
      call={call}
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
          onDevSignIn={devSignInOf(session.enter)}
        />
      )}
      <Screen chat={chat} dock={dock} onSharedCall={mode.mode === 'website' ? setCall : undefined}>
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
  readonly call: number | null;
}

// The opening's showcase loads on demand in a development build only (D63): a production bundle has
// neither the page, its words nor its path.
const Showcase = import.meta.env.DEV
  ? lazy(() => import('./screens/OpeningShowcase.js').then((m) => ({ default: m.OpeningShowcase })))
  : null;

function OpeningPage({ dev }: { dev: boolean }) {
  if (Showcase === null) return <p className="page">This page does not exist.</p>;
  return (
    <DevBoundary>
      <Suspense fallback={null}>
        <Showcase dev={dev} />
      </Suspense>
    </DevBoundary>
  );
}

/** The pages that need no feed: the result, the account area, the chronicle, the mail links. */
function plainPage(
  route: Route,
  mode: ServerMode,
  session: ReturnType<typeof useSession>,
  call: number | null,
): ReactNode {
  const me = session.me ?? null;
  const website = mode.mode === 'website';
  if (route.name === 'results') return <Result showId={route.showId} call={call} />;
  if (route.name === 'matches') return <Matches me={me} />;
  if (route.name === 'account') {
    return <AccountPage me={me} website={website} onGone={session.signOut} />;
  }
  if (route.name === 'privacy')
    return <PrivacyPage website={website} contact={mode.privacyContact} />;
  if (route.name === 'chronicle') return <Chronicle />;
  if (route.name === 'reset') return <ResetPage />;
  if (route.name === 'confirm') return <ConfirmPage />;
  if (route.name === 'opening') return <OpeningPage dev={mode.dev} />;
  return null;
}

function Routes({ route, me, mode, feed, current, session, phone, call }: RoutesProps) {
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
  const plain = plainPage(route, mode, session, call);
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
      onSignIn={devSignInOf(session.enter)}
      onEnter={session.enter}
    />
  );
}
