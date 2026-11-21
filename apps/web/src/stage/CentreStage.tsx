/**
 * @file   apps/web/src/stage/CentreStage.tsx
 * @brief  The selected case at the front, through the steps (CONCEPT §3.4, v1.1).
 *
 * Responsibility: show what the current step reveals and nothing more: "selected" the closed
 *                 case (the lights are down), "open" the artifact in its season colour with its
 *                 meaning under it ("Prize 1 · Gold", "Prize 1" without a label, or "No
 *                 prize"), "owner" the same while the lower third names the owner. Everything
 *                 comes from the view; nothing is decided here.
 * Depends on:     @sc/contracts (types), ./ArtifactEmblem.js
 */
import type { CaseView, PublicShowView } from '@sc/contracts';

import { ArtifactEmblem } from './ArtifactEmblem.js';

/** The meaning shown with an opened artifact. */
export function meaningText(show: PublicShowView, view: CaseView): string {
  const slot = show.prizeSlots.find((s) => s.slot === view.artifact?.prizeSlot);
  if (slot === undefined) return 'No prize';
  const label = slot.label.trim();
  return label === '' ? `Prize ${String(slot.slot)}` : `Prize ${String(slot.slot)} · ${label}`;
}

export function CentreStage({ show }: { show: PublicShowView }) {
  const { selected, step } = show.live;
  const view = show.cases.find((c) => c.number === selected);
  if (view === undefined) return null;
  // The artifact is drawn only once the view carries it (from the "Open" step, CONCEPT §8).
  const artifact = view.artifact;
  return (
    <div className="centre" data-step={step} aria-live="polite">
      <div className={`centre-case${artifact !== null ? ' is-open' : ''}`}>
        <span className="centre-number show-font">{view.number}</span>
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
