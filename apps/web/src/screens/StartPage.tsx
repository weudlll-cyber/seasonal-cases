/**
 * @file   apps/web/src/screens/StartPage.tsx
 * @brief  The start page (`/`): the logo and name, the current or next show on the kit's start
 *         card, its registration board, the sign-in for a guest and the lobby (DECISIONS D22,
 *         D24).
 *
 * Responsibility: in the shape of Mini Games' start screen: the card in the show's season colour
 *                 with its state, cases, prizes and how many are taken (picked while
 *                 registration is open, owned after); the registration board below it while
 *                 registration is open, the owners after the close; a way to the stage once the
 *                 show is sealed, to the result once it has ended. A player's pick goes to the
 *                 server's claim. The card has no countdown: shows have no start time yet, so no
 *                 `opensIn` is passed (kit v0.22.0). Everything shown comes from the feed.
 * Depends on:     @seasonal/kit/react, @sc/contracts (types), ../account/AccountEntry.js, ../lib/*,
 *                 ../board/*, ./BrandLogo.js, ./Lobby.js, ./SignIn.js
 */
import { StartCard } from '@seasonal/kit/react';
import type { Me, PublicShowView } from '@sc/contracts';
import { lazy, Suspense } from 'react';

import { AccountEntry } from '../account/AccountEntry.js';
import { RegistrationBoard } from '../board/RegistrationBoard.js';
import type { DevSignInFn } from '../lib/devSignIn.js';
import { post } from '../lib/base.js';
import type { ShowFeed } from '../lib/feed.js';
import type { ServerMode } from '../lib/mode.js';
import { Link } from '../lib/router.js';
import { useAction } from '../lib/useAction.js';
import { BrandLogo } from './BrandLogo.js';
import { Lobby } from './Lobby.js';
import { DevBoundary } from '../shell/DevBoundary.js';

// The development form loads on demand, in a development build only: a production build replaces
// import.meta.env.DEV with false, so neither the form nor its text is in the bundle (D63).
const DevForm = import.meta.env.DEV
  ? lazy(() => import('./SignIn.js').then((m) => ({ default: m.SignIn })))
  : null;

function DevSignInForm({ onSignIn }: { onSignIn: DevSignInFn }) {
  if (DevForm === null) return null;
  return (
    <DevBoundary>
      <Suspense fallback={null}>
        <DevForm onSignIn={onSignIn} />
      </Suspense>
    </DevBoundary>
  );
}

const STATE_TEXT = {
  setup: 'Being prepared',
  registration: 'Registration open',
  sealed: 'Sealed: starts soon',
  live: 'Live now',
  ended: 'Ended',
} as const;

export interface StartPageProps {
  readonly me: Me | null;
  readonly mode: ServerMode;
  readonly feed: ShowFeed;
  readonly showId: string | null | undefined;
  // The development sign-in: absent in a production build (../lib/devSignIn.ts).
  readonly onSignIn?: DevSignInFn | undefined;
  readonly onEnter: (me: Me) => void;
}

/** The state in words; a closed registration stays in the state 'registration' until sealing. */
function stateText(show: PublicShowView): string {
  if (show.state === 'registration' && !show.registrationOpen) return 'Registration closed';
  return STATE_TEXT[show.state];
}

/** How many cases are taken: picked ones on the open board, owned ones after the close. */
export function takenText(show: PublicShowView): string {
  if (show.board !== null) {
    return `${String(show.board.filter((c) => c.holder !== null).length)} picked`;
  }
  return `${String(show.cases.filter((c) => c.ownerName !== null).length)} owners`;
}

function ShowCard({ show }: { show: PublicShowView }) {
  const onStage = show.state === 'sealed' || show.state === 'live';
  return (
    <StartCard
      game="mini-games"
      season={show.season}
      title="The next show"
      icon={<BrandLogo />}
      badge={<span className="start-badge">{stateText(show)}</span>}
      special={
        <p className="start-links">
          {onStage && (
            <Link to="/show" className="tap">
              Go to the stage
            </Link>
          )}
          {show.state === 'ended' && (
            <Link to={`/results/${show.id}`} className="tap">
              See the result
            </Link>
          )}
        </p>
      }
      facts={[
        `${String(show.caseCount)} cases`,
        `${String(show.winnerCount)} prizes`,
        takenText(show),
      ]}
      signature={`${show.id}:${show.state}`}
    />
  );
}

/** A signed-in player's pick while registration is open; the server checks both again. */
function useClaim(me: Me | null, show: PublicShowView | null) {
  const action = useAction();
  const claimable = me?.role === 'player' && show?.registrationOpen === true ? show.id : null;
  const onClaim =
    claimable === null
      ? undefined
      : (caseNumber: number) => {
          action.run(() => post(`/shows/${claimable}/claim`, { caseNumber }));
        };
  return { onClaim, error: action.error };
}

export function StartPage({ me, mode, feed, showId, onSignIn, onEnter }: StartPageProps) {
  const { show } = feed;
  const { onClaim, error } = useClaim(me, show);
  const localGuest = me === null && mode.mode === 'local';
  return (
    <main className="page start-page" data-sk-game="cases">
      <header className="start-brand">
        <BrandLogo className="start-logo" />
        <h1>Seasonal Cases</h1>
      </header>
      {/* Website mode signs in through the website (the header's link); local mode has its own
          accounts, and the development sign-in too in development (DECISIONS D24). */}
      {localGuest && <AccountEntry onEnter={onEnter} />}
      {localGuest && mode.dev && onSignIn !== undefined && <DevSignInForm onSignIn={onSignIn} />}
      {showId === null && <p className="card">There is no show yet.</p>}
      {show !== null && (
        <>
          <ShowCard show={show} />
          {show.state === 'registration' && (
            <RegistrationBoard
              show={show}
              personal={feed.personal}
              error={error}
              {...(onClaim === undefined ? {} : { onClaim })}
            />
          )}
        </>
      )}
      <Lobby signature={show === null ? '' : `${show.id}:${show.state}`} />
    </main>
  );
}
