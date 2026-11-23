/**
 * @file   apps/web/src/stage/Ceremony.tsx
 * @brief  The winners' ceremony on the stage after "End show", then "See the result"
 *         (DECISIONS D22).
 *
 * Responsibility: a client-only sequence over the ended view's result, which the server does not
 *                 change: the winners one after another, from the lowest prize (the highest slot)
 *                 up to the main prize, 2.5 s apart (the chain's decision rule), each with its
 *                 artifact and the lower third; confetti on the main prize; then the link to the
 *                 result. Under reduced motion the steps still follow each other, without motion.
 * Depends on:     react, @sc/contracts (types), ../lib/router.js, ./ArtifactEmblem.js,
 *                 ./LowerThird.js
 */
import { prizeName, winnerText, type FoundPrize, type ShowResult } from '@sc/contracts';
import { useEffect, useState } from 'react';

import { Link } from '../lib/router.js';
import { ArtifactEmblem } from './ArtifactEmblem.js';
import { ConfettiPieces } from './LowerThird.js';

export const CEREMONY_STEP_MS = 2500;
const MAIN_PRIZE = 1;

/** The winners in the ceremony's order: the lowest prize first, the main prize last. */
export function ceremonyOrder(result: ShowResult): FoundPrize[] {
  return [...result.winners].sort((a, b) => b.slot - a.slot);
}

/** How many winners are shown: one more every step, then the end. */
function useCount(showId: string, total: number): number {
  const [count, setCount] = useState(1);
  useEffect(() => {
    setCount(1);
    const timer = window.setInterval(() => {
      setCount((n) => (n > total ? n : n + 1));
    }, CEREMONY_STEP_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [showId, total]);
  return count;
}

export interface CeremonyProps {
  readonly showId: string;
  readonly result: ShowResult;
  // The show's confetti setting (D25).
  readonly confetti?: boolean;
}

export function Ceremony({ showId, result, confetti = true }: CeremonyProps) {
  const order = ceremonyOrder(result);
  const count = useCount(showId, order.length);
  const current = order[Math.min(count, order.length) - 1];
  const done = count > order.length;
  return (
    <section className="ceremony" aria-label="The winners" aria-live="polite">
      <ol className="ceremony-shown">
        {order.slice(0, Math.min(count, order.length)).map((w) => (
          <li key={w.slot} className={w === current && !done ? 'is-now' : ''}>
            <span className="ceremony-slot">Prize {w.slot}</span>
            <ArtifactEmblem
              artifact={w.artifact}
              size={w === current && !done ? 'large' : 'small'}
            />
          </li>
        ))}
      </ol>
      {current !== undefined && !done && (
        <div className="lower-third" role="status">
          <span className="lower-third-case">
            {prizeName(current.slot, current.label)} · case {current.caseNumber}
          </span>
          <span className="lower-third-name">{winnerText(current.ownerName)}</span>
        </div>
      )}
      {confetti && current?.slot === MAIN_PRIZE && <ConfettiPieces />}
      {done && (
        <p className="ceremony-end">
          <Link to={`/results/${showId}`} className="button button-solid">
            See the result
          </Link>
        </p>
      )}
    </section>
  );
}
