/**
 * @file   apps/web/src/stage/LowerThird.tsx
 * @brief  The lower third at the "Owner" step: the owner's name and rank badge; confetti on the
 *         main prize.
 *
 * Responsibility: the TV-studio caption of CONCEPT §3.4 step 5. The rank badge stands in for
 *                 the Discord badge until website mode (BACKLOG 4). Confetti only when the case
 *                 holds the main prize (slot 1), as CSS particles; under reduced motion the
 *                 kit's motion.css stops them and ./stage.css hides them.
 * Depends on:     @sc/contracts (types)
 */
import type { PublicShowView } from '@sc/contracts';
import type { CSSProperties } from 'react';

const PIECES = 36;
const MAIN_PRIZE = 1;

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, i) => (
        <span
          key={i}
          className={`confetti-piece piece-${String(i % 4)}`}
          style={{ '--i': i } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function LowerThird({ show }: { show: PublicShowView }) {
  if (show.live.step !== 'owner') return null;
  const view = show.cases.find((c) => c.number === show.live.selected);
  if (view === undefined) return null;
  const main = view.artifact?.prizeSlot === MAIN_PRIZE;
  return (
    <>
      {main && <Confetti />}
      <div className="lower-third" role="status">
        <span className="lower-third-case">Case {view.number} belongs to</span>
        <span className="lower-third-name">{view.ownerName ?? 'nobody'}</span>
        {view.ownerRank !== null && (
          <span className="rank-badge" title={`Seasonal rank ${String(view.ownerRank)}`}>
            Rank {view.ownerRank}
          </span>
        )}
      </div>
    </>
  );
}
