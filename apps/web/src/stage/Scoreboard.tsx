/**
 * @file   apps/web/src/stage/Scoreboard.tsx
 * @brief  The scoreboard on the stage: every artifact with its prize, which are still hidden,
 *         which lights up now, and which are taken (DECISIONS D20).
 *
 * Responsibility: one row per prize artifact in slot order, then the blank artifact, each with
 *                 its emblem, name and "Prize n: label", "Prize n" or "no prize". A row's state comes only
 *                 from the received public view: "open" (still hidden), "lit" (its case is at
 *                 the front and open, with the owner's name from the "Owner" step), "taken" (its
 *                 case has left the front: struck through, the owner's name kept, "not won" for
 *                 a case nobody claimed, D34). The blank
 *                 row lights up while a blank is at the front and is never taken: there are many.
 *                 Visible from sealing on, to everyone; the commitment stays beside it.
 * Depends on:     @sc/contracts, @sc/ui, ./ArtifactEmblem.js
 */
import {
  ownerText,
  prizeTitle,
  winnerText,
  type Artifact,
  type PublicShowView,
} from '@sc/contracts';
import { shortCommitment } from '@sc/ui';

import { ArtifactEmblem } from './ArtifactEmblem.js';

export type RowState = 'open' | 'lit' | 'taken';

export interface ScoreRow {
  readonly artifact: Artifact;
  readonly meaning: string;
  readonly state: RowState;
  readonly owner: string | null;
}

const OPEN_AT_FRONT = new Set(['open', 'owner']);

/** The rows, computed from the view alone. */
export function scoreRows(show: PublicShowView): ScoreRow[] {
  const front = show.cases.find((c) => c.number === show.live.selected);
  const frontOpen = front !== undefined && OPEN_AT_FRONT.has(show.live.step);
  const ownerShown = show.live.step === 'owner';
  return show.artifactTable.map((artifact): ScoreRow => {
    const slot = show.prizeSlots.find((s) => s.slot === artifact.prizeSlot);
    const meaning = slot === undefined ? 'no prize' : prizeTitle(slot);
    if (artifact.prizeSlot === null) {
      const lit = frontOpen && front.artifact?.prizeSlot === null;
      return {
        artifact,
        meaning,
        state: lit ? 'lit' : 'open',
        owner: lit && ownerShown ? ownerText(front.ownerName) : null,
      };
    }
    const holder = show.cases.find((c) => c.artifact?.id === artifact.id);
    if (holder === undefined) return { artifact, meaning, state: 'open', owner: null };
    if (frontOpen && holder.number === front.number) {
      return {
        artifact,
        meaning,
        state: 'lit',
        owner: ownerShown ? winnerText(holder.ownerName) : null,
      };
    }
    return { artifact, meaning, state: 'taken', owner: winnerText(holder.ownerName) };
  });
}

const STATE_WORDS: Record<RowState, string> = {
  open: 'still hidden',
  lit: 'found now',
  taken: 'taken',
};

export function Scoreboard({ show }: { show: PublicShowView }) {
  if (show.commitment === null) return null;
  return (
    <header className="scoreboard" data-fit-fixed>
      <ol className="scoreboard-rows" aria-label="Scoreboard">
        {scoreRows(show).map((row) => (
          <li
            key={row.artifact.id}
            className={`score-row is-${row.state}`}
            data-state={row.state}
            title={`${row.artifact.name}: ${row.meaning}, ${STATE_WORDS[row.state]}`}
          >
            <ArtifactEmblem artifact={row.artifact} />
            <span className="score-meaning">{row.meaning}</span>
            {row.owner !== null && <span className="score-owner">{row.owner}</span>}
            <span className="sk-visually-hidden">{STATE_WORDS[row.state]}</span>
          </li>
        ))}
      </ol>
      <span className="stage-commitment" title={`Commitment ${show.commitment}`}>
        commitment {shortCommitment(show.commitment)}
      </span>
    </header>
  );
}
