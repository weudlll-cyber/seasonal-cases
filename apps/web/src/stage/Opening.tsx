/**
 * @file   apps/web/src/stage/Opening.tsx
 * @brief  The opening moment on the stage, after "Start show" and before the first case
 *         (DECISIONS D22).
 *
 * Responsibility: for everyone the show's title, the number of cases and prizes, and the
 *                 artifact table, while the cases with their owners roll in on the half circle
 *                 (./stage.css, `data-opening`); for the direction holder only, "Begin", which
 *                 ends the opening on the server (`direction:begin`). Until then no case can be
 *                 selected: the server refuses it, and the stage offers no click.
 * Depends on:     @sc/contracts, ../lib/useAction.js, ./ArtifactEmblem.js
 */
import { prizeTitle, type Ack, type PublicShowView } from '@sc/contracts';

import { useAction } from '../lib/useAction.js';
import { ArtifactEmblem } from './ArtifactEmblem.js';

export interface OpeningProps {
  readonly show: PublicShowView;
  // Present only for the direction holder.
  readonly onBegin?: () => Promise<Ack>;
}

export function Opening({ show, onBegin }: OpeningProps) {
  const action = useAction();
  return (
    <section className="opening" aria-label="Opening">
      <h2 className="opening-title show-font">Seasonal Cases</h2>
      <p className="opening-facts">
        {show.caseCount} cases · {show.winnerCount} prizes
      </p>
      <ul className="opening-table">
        {show.artifactTable.map((a) => {
          const slot = show.prizeSlots.find((s) => s.slot === a.prizeSlot);
          return (
            <li key={a.id}>
              <ArtifactEmblem artifact={a} />
              <span>{slot === undefined ? 'no prize' : prizeTitle(slot)}</span>
            </li>
          );
        })}
      </ul>
      {onBegin !== undefined && (
        <button
          type="button"
          className="button button-solid opening-begin"
          title="End the opening: from now on you can click a case"
          disabled={action.busy}
          onClick={() => {
            action.run(onBegin);
          }}
        >
          Begin
        </button>
      )}
      {action.error !== null && <p role="alert">{action.error}</p>}
    </section>
  );
}
