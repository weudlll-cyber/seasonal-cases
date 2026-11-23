/**
 * @file   apps/web/src/stage/LowerThird.tsx
 * @brief  The lower third at the "Owner" step: the owner's name and rank badge; and the confetti
 *         on the main prize.
 *
 * Responsibility: the TV-studio caption of CONCEPT §3.4 step 5. The rank badge stands in for
 *                 the Discord badge until website mode (BACKLOG 4). Confetti only at the "Owner"
 *                 step of the main prize (slot 1) and only when the show has it on (D25), as CSS
 *                 particles; under reduced motion the
 *                 kit's motion.css stops them and ./stageParts.css hides them. The Stage places
 *                 the confetti outside its measured parts, so the falling pieces never count as
 *                 overflow for the fit.
 * Depends on:     react, @sc/contracts (types), ./applause.js, ./Badges.js
 */
import { ownerText, type CaseView, type PublicShowView } from '@sc/contracts';
import type { CSSProperties } from 'react';

import { confettiPieces, type ApplauseStep } from './applause.js';
import { Badges } from './Badges.js';

const PIECES = 36;
const MAIN_PRIZE = 1;

/** The case on the centre stage at the "Owner" step, or undefined. */
function ownerStepCase(show: PublicShowView): CaseView | undefined {
  if (show.live.step !== 'owner') return undefined;
  return show.cases.find((c) => c.number === show.live.selected);
}

export function Confetti({ show, step = 1 }: { show: PublicShowView; step?: ApplauseStep }) {
  if (!show.presentation.confetti) return null;
  if (ownerStepCase(show)?.artifact?.prizeSlot !== MAIN_PRIZE) return null;
  return <ConfettiPieces step={step} />;
}

/**
 * The falling pieces themselves; the ceremony shows them for the main prize too. More with the
 * applause of the last 10 s (./applause.ts, D39).
 */
export function ConfettiPieces({ step = 1 }: { step?: ApplauseStep }) {
  return (
    <div className="confetti" aria-hidden="true" data-step={step}>
      {Array.from({ length: confettiPieces(PIECES, step) }, (_, i) => (
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
      {/* A case nobody claimed shows "Unclaimed" in place of a name (D34). */}
      <span className="lower-third-case">
        Case {view.number}
        {view.ownerName === null ? '' : ' belongs to'}
      </span>
      <span className="lower-third-name">
        <Badges badges={view.ownerBadges} />
        {ownerText(view.ownerName)}
      </span>
      {view.ownerRank !== null && (
        <span className="rank-badge" title={`Seasonal rank ${String(view.ownerRank)}`}>
          Rank {view.ownerRank}
        </span>
      )}
    </div>
  );
}
