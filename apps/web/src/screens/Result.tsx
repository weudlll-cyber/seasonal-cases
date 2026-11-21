/**
 * @file   apps/web/src/screens/Result.tsx
 * @brief  The result screen: the winners, then all cases, then the sealing line (CONCEPT §3.5).
 *
 * Responsibility: render the ended show's result as the server sent it, with the line
 *                 "sealed at <time> · commitment <first 12 hex> · verified". The server checked
 *                 the commitment; the client shows its answer.
 * Depends on:     react, @seasonal/kit/react, @sc/contracts, @sc/ui, ../lib/api.js,
 *                 ../stage/ArtifactEmblem.js
 */
import { useFitScale } from '@seasonal/kit/react';
import type { PublicShowView, ShowResult } from '@sc/contracts';
import { formatTime, shortCommitment, useDockReserve } from '@sc/ui';
import { useEffect, useState, type CSSProperties } from 'react';

import { getJson } from '../lib/api.js';
import { ArtifactEmblem } from '../stage/ArtifactEmblem.js';

export function ResultView({ result }: { result: ShowResult }) {
  const reserve = useDockReserve();
  const fitRef = useFitScale<HTMLElement>('mini-games', String(result.cases.length), true);
  const style = { '--dock-reserve': `${String(reserve)}px` } as CSSProperties;
  return (
    <section
      className="result-screen"
      data-sk-game="cases"
      ref={fitRef}
      style={style}
      aria-label="Result"
    >
      <h2 data-fit-fixed>The winners</h2>
      <ol className="result-winners" data-fit-fixed>
        {result.winners.map((w) => (
          <li key={w.slot}>
            <span className="result-slot">Prize {w.slot}</span>
            {/* The label is "Prize n" when none was given; it is not repeated. */}
            {w.label !== `Prize ${String(w.slot)}` && (
              <span className="result-label">{w.label}</span>
            )}
            <ArtifactEmblem artifact={w.artifact} />
            <span className="result-owner">{w.ownerName ?? 'no owner'}</span>
            <span className="result-case">case {w.caseNumber}</span>
          </li>
        ))}
      </ol>
      <div
        className="result-scroll"
        role="region"
        aria-label="All cases"
        tabIndex={0}
        data-fit-fixed
      >
        <ol className="result-cases">
          {result.cases.map((c) => (
            <li key={c.number}>
              <span className="result-number show-font">{c.number}</span>
              <span className="result-case-owner">{c.ownerName ?? 'no owner'}</span>
              <ArtifactEmblem artifact={c.artifact} />
            </li>
          ))}
        </ol>
      </div>
      <p
        className="result-seal"
        data-fit-fixed
        title={`Commitment ${result.commitment}, secret ${result.secret}`}
      >
        sealed at {formatTime(result.sealedAt)} · commitment{' '}
        <span className="commitment" data-commitment={result.commitment}>
          {shortCommitment(result.commitment)}
        </span>{' '}
        · {result.verified ? 'verified' : 'NOT verified'}
      </p>
    </section>
  );
}

export function Result({ showId }: { showId: string }) {
  const [show, setShow] = useState<PublicShowView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getJson<PublicShowView>(`/api/shows/${showId}`)
      .then(setShow)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [showId]);
  if (error !== null) return <p className="page card">{error}</p>;
  if (show === null) return <p className="page">Loading…</p>;
  if (show.result === null) return <p className="page card">This show has not ended yet.</p>;
  return <ResultView result={show.result} />;
}
