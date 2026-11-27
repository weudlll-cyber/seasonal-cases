/**
 * @file   apps/web/src/screens/Lobby.tsx
 * @brief  The lobby on the start page: every show, newest first, with the way to it.
 *
 * Responsibility: one line per show with its state, cases, prizes and date (DECISIONS D24). The
 *                 stage follows the current show, so a sealed or live show links to the stage and
 *                 an ended one to its result. Read again whenever the current show changes.
 * Depends on:     react, @sc/contracts, @sc/ui, ../lib/*
 */
import { counted, type ShowSummary } from '@sc/contracts';
import { formatTime } from '@sc/ui';
import { useEffect, useState } from 'react';

import { api } from '../lib/base.js';
import { Link } from '../lib/router.js';

function Way({ show }: { show: ShowSummary }) {
  if (show.state === 'ended')
    return (
      <Link to={`/results/${show.id}`} className="tap">
        Result
      </Link>
    );
  if (show.state === 'sealed' || show.state === 'live')
    return (
      <Link to="/show" className="tap">
        Stage
      </Link>
    );
  return null;
}

export function Lobby({ signature }: { signature: string }) {
  const [shows, setShows] = useState<ShowSummary[]>([]);
  useEffect(() => {
    api<ShowSummary[]>('/shows')
      .then(setShows)
      .catch(() => undefined);
  }, [signature]);
  if (shows.length === 0) return null;
  return (
    <section className="sk-panel lobby" aria-label="All shows">
      <h2>All shows</h2>
      <ul className="lobby-list">
        {shows.map((s) => (
          <li key={s.id}>
            <span>{formatTime(s.createdAt)}</span>
            <span>{s.state}</span>
            <span>
              {counted(s.caseCount, 'case')} · {counted(s.winnerCount, 'prize')}
            </span>
            <Way show={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}
