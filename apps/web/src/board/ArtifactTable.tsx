/**
 * @file   apps/web/src/board/ArtifactTable.tsx
 * @brief  The artifact table: which artifact means which prize, and which means none.
 *
 * Responsibility: shown to everyone from registration on (CONCEPT §3.1, §6), from the view's
 *                 `artifactTable` and `prizeSlots`; the commitment once the show is sealed.
 * Depends on:     @sc/contracts, @sc/ui, ../stage/ArtifactEmblem.js
 */
import { prizeTitle, type PublicShowView } from '@sc/contracts';
import { formatTime, shortCommitment } from '@sc/ui';

import { ArtifactEmblem } from '../stage/ArtifactEmblem.js';

export function ArtifactTable({ show }: { show: PublicShowView }) {
  return (
    <aside className="artifact-table" aria-label="Artifact table" data-fit-fixed>
      <ul>
        {show.artifactTable.map((a) => {
          const slot = show.prizeSlots.find((s) => s.slot === a.prizeSlot);
          return (
            <li key={a.id}>
              <ArtifactEmblem artifact={a} />
              <span className="artifact-meaning">
                {slot === undefined ? 'no prize' : prizeTitle(slot)}
              </span>
            </li>
          );
        })}
      </ul>
      {show.commitment !== null && show.sealedAt !== null && (
        <p className="artifact-commitment" title={`Commitment ${show.commitment}`}>
          Sealed at {formatTime(show.sealedAt)} · commitment{' '}
          <span className="commitment" data-commitment={show.commitment}>
            {shortCommitment(show.commitment)}
          </span>
        </p>
      )}
    </aside>
  );
}
