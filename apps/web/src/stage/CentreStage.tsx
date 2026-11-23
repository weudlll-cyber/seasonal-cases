/**
 * @file   apps/web/src/stage/CentreStage.tsx
 * @brief  The case at the front, through the steps (CONCEPT §3.4, v1.1), with its travel.
 *
 * Responsibility: show what the current step reveals and nothing more: after the click the
 *                 closed case (./CasePicture.tsx) travels from its place to the front
 *                 (./travel.ts) while the lights go down; at "Open" the latches flip, the lid
 *                 swings open towards the viewer, the artifact rises out of the case in its
 *                 season colour and its meaning appears last ("Prize 1 · Gold", "Prize 1"
 *                 without a label, or "No prize"), in the phases of ./motion.ts; at "Owner" it
 *                 stays while the lower third names the owner; after "Back to stage" it travels
 *                 home with its lid open (D49). The artifact rises straight up from the case's
 *                 centre (D50). A visually hidden polite live region says the artifact's name and
 *                 meaning at once at "Open", independent of the picture's timing (D52). The
 *                 artifact is drawn only once the view carries it (CONCEPT §8). Everything comes
 *                 from the view.
 * Depends on:     react, @sc/contracts (types), ./ArtifactEmblem.js, ./CasePicture.js,
 *                 ./travel.js
 */
import { prizeTitle, type CaseView, type PublicShowView } from '@sc/contracts';
import { useRef } from 'react';

import { ArtifactEmblem } from './ArtifactEmblem.js';
import { CasePicture } from './CasePicture.js';
import { useArrival, useHomeward } from './travel.js';

/** What a screen reader hears at "Open": the case, the artifact's name and its meaning. */
export function openedText(show: PublicShowView, view: CaseView): string {
  if (view.artifact === null) return '';
  return `Case ${String(view.number)}: ${view.artifact.name}, ${meaningText(show, view)}`;
}

/** The meaning shown with an opened artifact. */
export function meaningText(show: PublicShowView, view: CaseView): string {
  const slot = show.prizeSlots.find((s) => s.slot === view.artifact?.prizeSlot);
  return slot === undefined ? 'No prize' : prizeTitle(slot);
}

interface FrontCaseProps {
  readonly show: PublicShowView;
  readonly view: CaseView;
  // 'front': selected or open now; 'home': on its way back after "Back to stage".
  readonly phase: 'front' | 'home';
}

function FrontCase({ show, view, phase }: FrontCaseProps) {
  const ref = useRef<HTMLDivElement>(null);
  useArrival(ref, view.number, phase === 'front');
  useHomeward(ref, view.number, phase === 'home');
  const { artifact } = view;
  // At the front the opening plays once the view carries the artifact; home, it stays open.
  const state = artifact === null ? 'closed' : phase === 'front' ? 'opening' : 'open';
  return (
    <div className="centre" data-phase={phase}>
      {/* Heard at once at "Open", whatever the picture's timing (D52). Mounted with the case
          at "selected", empty until the view carries the artifact, so the change is announced;
          a live region without the role "status", which stays the lower third's. */}
      <p className="sk-visually-hidden" aria-live="polite">
        {phase === 'front' ? openedText(show, view) : ''}
      </p>
      <div
        ref={ref}
        className={`centre-case${artifact !== null ? ' is-open' : ''}`}
        data-case={view.number}
      >
        <CasePicture state={state} number={view.number} risen>
          {artifact !== null ? <ArtifactEmblem artifact={artifact} size="large" /> : undefined}
        </CasePicture>
      </div>
      {artifact !== null && phase === 'front' && (
        <p className={`centre-meaning${artifact.prizeSlot === null ? ' is-blank' : ''}`}>
          {meaningText(show, view)}
        </p>
      )}
    </div>
  );
}

export function CentreStage({
  show,
  returning,
}: {
  show: PublicShowView;
  returning: number | null;
}) {
  const front = show.cases.find((c) => c.number === show.live.selected);
  if (front !== undefined)
    return <FrontCase key={front.number} show={show} view={front} phase="front" />;
  const home = show.cases.find((c) => c.number === returning);
  if (home !== undefined)
    return <FrontCase key={home.number} show={show} view={home} phase="home" />;
  return null;
}
