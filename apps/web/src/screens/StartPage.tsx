/**
 * @file   apps/web/src/screens/StartPage.tsx
 * @brief  The start page (`/`): the logo and name, the current or next show on the kit's start
 *         card, its registration board, and the sign-in for a guest (DECISIONS D22).
 *
 * Responsibility: in the shape of Mini Games' start screen: the card in the show's season colour
 *                 with its state, cases and prizes; the registration board below it while
 *                 registration is open, the owners after the close; a way to the stage once the
 *                 show is sealed, to the result once it has ended. A player's pick goes to the
 *                 server's claim. The card's "Opens in N s" stays hidden: shows have no start
 *                 time yet (`.start-page` in ./screens.css). Everything shown comes from the feed.
 * Depends on:     @seasonal/kit/react, @sc/contracts (types), ../lib/*, ../board/*, ./SignIn.js,
 *                 assets/brand/logo.webp
 */
import { StartCard } from '@seasonal/kit/react';
import type { Me, PublicShowView, SignInRequest } from '@sc/contracts';

import logo from '../../../../assets/brand/logo.webp';
import { RegistrationBoard } from '../board/RegistrationBoard.js';
import { postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import type { ShowFeed } from '../lib/feed.js';
import type { ServerMode } from '../lib/mode.js';
import { Link } from '../lib/router.js';
import { useAction } from '../lib/useAction.js';
import { SignIn } from './SignIn.js';

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
  readonly onSignIn: (request: SignInRequest) => Promise<void>;
}

/** The state in words; a closed registration stays in the state 'registration' until sealing. */
function stateText(show: PublicShowView): string {
  if (show.state === 'registration' && !show.registrationOpen) return 'Registration closed';
  return STATE_TEXT[show.state];
}

function ShowCard({ show }: { show: PublicShowView }) {
  const onStage = show.state === 'sealed' || show.state === 'live';
  return (
    <StartCard
      game="mini-games"
      season={show.season}
      title="The next show"
      icon={<img src={logo} alt="" />}
      badge={<span className="start-badge">{stateText(show)}</span>}
      special={
        <p className="start-links">
          {onStage && <Link to="/show">Go to the stage</Link>}
          {show.state === 'ended' && <Link to={`/results/${show.id}`}>See the result</Link>}
        </p>
      }
      facts={[
        `${String(show.caseCount)} cases`,
        `${String(show.winnerCount)} prizes`,
        `${String(show.cases.filter((c) => c.ownerName !== null).length)} owners`,
      ]}
      opensIn={0}
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
          action.run(() => postJson(apiPath(`/shows/${claimable}/claim`), { caseNumber }));
        };
  return { onClaim, error: action.error };
}

export function StartPage({ me, mode, feed, showId, onSignIn }: StartPageProps) {
  const { show } = feed;
  const { onClaim, error } = useClaim(me, show);
  const devSignIn = me === null && mode.mode === 'local' && mode.dev;
  return (
    <main className="page start-page" data-sk-game="cases">
      <header className="start-brand">
        <img src={logo} alt="" className="start-logo" />
        <h1>Seasonal Cases</h1>
      </header>
      {/* Website mode signs in through the website (the header's link); local mode has the
          development sign-in in development (DECISIONS D24). */}
      {devSignIn && <SignIn onSignIn={onSignIn} />}
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
    </main>
  );
}
