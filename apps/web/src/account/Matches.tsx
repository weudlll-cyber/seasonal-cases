/**
 * @file   apps/web/src/account/Matches.tsx
 * @brief  `/matches` ("My matches", CONCEPT §3.5): the signed-in user's case in every show.
 *
 * Responsibility: one row per show with the case, whether it is owned or only asked for, and the
 *                 prize once its case is open (the server never sends it earlier), linking to the
 *                 result of an ended show.
 * Depends on:     react, @sc/contracts (types), @sc/ui, ../lib/*
 */
import type { Match, Me } from '@sc/contracts';
import { formatTime } from '@sc/ui';
import { useEffect, useState } from 'react';

import { api } from '../lib/base.js';
import { Link } from '../lib/router.js';

function prizeText(match: Match): string {
  if (match.prize !== null) return match.prize;
  return match.owner ? 'Not opened yet' : 'Asked for; registration decides';
}

export function Matches({ me }: { me: Me | null }) {
  const [matches, setMatches] = useState<Match[] | null>(null);
  useEffect(() => {
    if (me === null) return;
    api<Match[]>('/me/matches')
      .then(setMatches)
      .catch(() => {
        setMatches([]);
      });
  }, [me]);
  if (me === null) return <p className="page card">Sign in to see your matches.</p>;
  return (
    <main className="page">
      <section className="card" aria-label="My matches">
        <h1>My matches</h1>
        {matches?.length === 0 && <p>You have not picked a case yet.</p>}
        <ul className="match-list">
          {(matches ?? []).map((m) => (
            <li key={m.showId}>
              <span>{formatTime(m.createdAt)}</span>
              <span>Case {m.caseNumber}</span>
              <span>{prizeText(m)}</span>
              {m.state === 'ended' && (
                <Link to={`/results/${m.showId}`} className="tap">
                  Result
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
