/**
 * @file   apps/web/src/stage/CentreStage.tsx
 * @brief  The case at the front, through the steps (CONCEPT §3.4, v1.1), with its travel.
 *
 * Responsibility: show what the current step reveals and nothing more: after the click the
 *                 closed case travels from its place to the front (./travel.ts) while the lights
 *                 go down; at "Open" the lid lifts slowly, the artifact rises in its season
 *                 colour and its meaning appears last ("Prize 1 · Gold", "Prize 1" without a
 *                 label, or "No prize"); at "Owner" it stays while the lower third names the
 *                 owner; after "Back to stage" it closes and travels home. The artifact is drawn
 *                 only once the view carries it (CONCEPT §8). Everything comes from the view.
 * Depends on:     react, @sc/contracts (types), ./ArtifactEmblem.js, ./travel.js
 */
import { prizeTitle, type CaseView, type PublicShowView } from '@sc/contracts';
import { useRef } from 'react';

import { ArtifactEmblem } from './ArtifactEmblem.js';
import { useArrival, useHomeward } from './travel.js';

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
  const artifact = phase === 'front' ? view.artifact : null;
  const classes = [
    'centre-case',
    artifact !== null ? 'is-open' : '',
    phase === 'home' ? 'is-closing' : '',
  ];
  return (
    <div className="centre" data-phase={phase} aria-live="polite">
      <div ref={ref} className={classes.filter((c) => c !== '').join(' ')} data-case={view.number}>
        <span className="centre-glow" aria-hidden="true" />
        <span className="case-lid">
          <span className="centre-number show-font">{view.number}</span>
        </span>
        {artifact !== null && <ArtifactEmblem artifact={artifact} size="large" />}
      </div>
      {artifact !== null && (
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
