/**
 * @file   apps/web/src/stage/CentreStage.tsx
 * @brief  The selected case large in the centre, through the five steps (CONCEPT §3.4).
 *
 * Responsibility: show what the current step reveals and nothing more: "selected" the closed
 *                 case, "tension" the same with the drum-roll motion, "open" the artifact in its
 *                 season colour, "prize" its meaning (the prize slot and label, or "No prize"),
 *                 "owner" the same while the lower third names the owner. Everything comes from
 *                 the view; nothing is decided here.
 * Depends on:     @sc/contracts, ./ArtifactEmblem.js
 */
import { prizeLabel, type CaseView, type PublicShowView, type RevealStep } from '@sc/contracts';

import { ArtifactEmblem } from './ArtifactEmblem.js';

const STEP_WORDS: Record<RevealStep, string> = {
  idle: '',
  selected: 'Selected',
  tension: 'Tension…',
  open: 'Open',
  prize: 'Prize',
  owner: 'Owner',
};

function Meaning({ show, view }: { show: PublicShowView; view: CaseView }) {
  const slot = show.prizeSlots.find((s) => s.slot === view.artifact?.prizeSlot);
  if (slot === undefined) return <p className="centre-meaning is-blank">No prize</p>;
  return (
    <p className="centre-meaning">
      <span className="centre-slot">Prize {slot.slot}</span>
      <span className="centre-label">{prizeLabel(slot)}</span>
    </p>
  );
}

export function CentreStage({ show }: { show: PublicShowView }) {
  const { selected, step } = show.live;
  const view = show.cases.find((c) => c.number === selected);
  if (view === undefined) return null;
  const revealed = view.artifact !== null;
  const meaningShown = step === 'prize' || step === 'owner';
  return (
    <div className="centre" data-step={step} aria-live="polite">
      <p className="centre-step">{STEP_WORDS[step]}</p>
      <div className={`centre-case${revealed ? ' is-open' : ''}`}>
        <span className="centre-number show-font">{view.number}</span>
        {revealed && view.artifact !== null && (
          <ArtifactEmblem artifact={view.artifact} size="large" />
        )}
      </div>
      {meaningShown && <Meaning show={show} view={view} />}
    </div>
  );
}
