/**
 * @file   apps/web/src/screens/Lobby.tsx
 * @brief  The lobby: the sign-in for a guest, then the current show, its state and its
 *         registration board.
 *
 * Responsibility: route a player's pick to the server's claim; show where the show stands and
 *                 lead to the stage once it is sealed. Everything shown comes from the feed.
 * Depends on:     @sc/contracts (types), ../lib/*, ../board/RegistrationBoard.js, ./SignIn.js
 */
import type { Me, PublicShowView, SignInRequest } from '@sc/contracts';

import { RegistrationBoard } from '../board/RegistrationBoard.js';
import { postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import type { ShowFeed } from '../lib/feed.js';
import { Link } from '../lib/router.js';
import { useAction } from '../lib/useAction.js';
import { SignIn } from './SignIn.js';

const STATE_TEXT = {
  setup: 'A show is being prepared.',
  registration: 'Registration is open.',
  sealed: 'The cases are sealed: the show starts soon.',
  live: 'The show is live.',
  ended: 'The show has ended.',
} as const;

export interface LobbyProps {
  readonly me: Me | null;
  readonly feed: ShowFeed;
  readonly showId: string | null | undefined;
  readonly onSignIn: (request: SignInRequest) => Promise<void>;
}

function ShowState({ show }: { show: PublicShowView }) {
  const onStage = show.state === 'sealed' || show.state === 'live';
  // A closed registration stays in the state 'registration' until sealing.
  const closed = show.state === 'registration' && !show.registrationOpen;
  return (
    <p className="lobby-state">
      {closed ? 'Registration is closed: the cases are being sealed.' : STATE_TEXT[show.state]}{' '}
      {onStage && <Link to="/show">Go to the stage</Link>}
      {show.state === 'ended' && <Link to={`/results/${show.id}`}>See the result</Link>}
    </p>
  );
}

export function Lobby({ me, feed, showId, onSignIn }: LobbyProps) {
  const action = useAction();
  const { show } = feed;
  // A signed-in player may pick while registration is open; the server checks both again.
  const claimable = me?.role === 'player' && show?.registrationOpen === true ? show.id : null;
  const onClaim =
    claimable === null
      ? undefined
      : (caseNumber: number) => {
          action.run(() => postJson(apiPath(`/shows/${claimable}/claim`), { caseNumber }));
        };
  return (
    <main className="page lobby">
      {me === null && <SignIn onSignIn={onSignIn} />}
      {showId === null && <p className="card">There is no show yet.</p>}
      {show !== null && (
        <>
          <ShowState show={show} />
          <RegistrationBoard
            show={show}
            personal={feed.personal}
            error={action.error}
            {...(onClaim === undefined ? {} : { onClaim })}
          />
        </>
      )}
    </main>
  );
}
