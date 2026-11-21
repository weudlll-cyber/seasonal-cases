/**
 * @file   apps/web/src/stage/TopBar.tsx
 * @brief  The stage's top bar: the prizes still hidden and the prizes found with their owners.
 *
 * Responsibility: "Still hidden: Halving Stone · Season Key …" and, once a prize's meaning is
 *                 shown, its artifact with the owner's name (CONCEPT §7); the short commitment
 *                 from sealing on, with the whole one as a tooltip.
 * Depends on:     @sc/contracts (types), @sc/ui, ./ArtifactEmblem.js
 */
import type { PublicShowView } from '@sc/contracts';
import { shortCommitment } from '@sc/ui';

import { ArtifactEmblem } from './ArtifactEmblem.js';

export function TopBar({ show }: { show: PublicShowView }) {
  return (
    <header className="stage-top" data-fit-fixed>
      <div className="stage-hidden">
        <span className="stage-top-label">Still hidden:</span>
        {show.stillHidden.length === 0 ? (
          <span className="stage-top-none">nothing, every prize is found</span>
        ) : (
          show.stillHidden.map((a) => <ArtifactEmblem key={a.id} artifact={a} />)
        )}
      </div>
      {show.found.length > 0 && (
        <div className="stage-hidden">
          <span className="stage-top-label">Found:</span>
          <ul className="stage-found" aria-label="Found prizes">
            {show.found.map((f) => (
              <li key={f.slot}>
                <ArtifactEmblem artifact={f.artifact} />
                <span className="stage-found-owner">{f.ownerName ?? 'no owner'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {show.commitment !== null && (
        <span className="stage-commitment" title={`Commitment ${show.commitment}`}>
          commitment {shortCommitment(show.commitment)}
        </span>
      )}
    </header>
  );
}
