/**
 * @file   apps/web/src/stage/LowerThird.tsx
 * @brief  The lower third at the "Owner" step: the owner's name and rank badge; and the confetti
 *         on the main prize.
 *
 * Responsibility: the TV-studio caption of CONCEPT §3.4 step 5. The rank badge stands in for
 *                 the Discord badge until website mode (BACKLOG 4). Confetti only at the "Owner"
 *                 step of the main prize (slot 1), as CSS particles; under reduced motion the
 *                 kit's motion.css stops them and ./stageParts.css hides them. The Stage places
 *                 the confetti outside its measured parts, so the falling pieces never count as
 *                 overflow for the fit.
 * Depends on:     react, @sc/contracts (types)
 */
import type { CaseView, PublicShowView } from '@sc/contracts';
import type { CSSProperties } from 'react';

const PIECES = 36;
const MAIN_PRIZE = 1;

/** The case on the centre stage at the "Owner" step, or undefined. */
function ownerStepCase(show: PublicShowView): CaseView | undefined {
  if (show.live.step !== 'owner') return undefined;
  return show.cases.find((c) => c.number === show.live.selected);
}

export function Confetti({ show }: { show: PublicShowView }) {
  if (ownerStepCase(show)?.artifact?.prizeSlot !== MAIN_PRIZE) return null;
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
  const view = ownerStepCase(show);
  if (view === undefined) return null;
  return (
    <div className="lower-third" role="status">
      <span className="lower-third-case">Case {view.number} belongs to</span>
      <span className="lower-third-name">{view.ownerName ?? 'nobody'}</span>
      {view.ownerRank !== null && (
        <span className="rank-badge" title={`Seasonal rank ${String(view.ownerRank)}`}>
          Rank {view.ownerRank}
        </span>
      )}
    </div>
  );
}
