/**
 * @file   apps/web/src/stage/CaseToken.tsx
 * @brief  One case on the stage: its number, its owner's name and a soft season glow.
 *
 * Responsibility: render a case as the view says: closed, selected (it is on the centre
 *                 stage), or opened (its artifact small beside the number). For the direction
 *                 holder it is a button that selects the case; for everyone else plain content.
 * Depends on:     react, @sc/contracts (types), ./ArtifactEmblem.js, ./arc.js
 */
import type { CaseView } from '@sc/contracts';
import type { CSSProperties } from 'react';

import { ArtifactEmblem } from './ArtifactEmblem.js';
import type { Spot } from './arc.js';

export interface CaseTokenProps {
  readonly view: CaseView;
  readonly spot: Spot;
  // At the front now, or on its way back: its place stays, the case itself is away.
  readonly away: boolean;
  // Present only for the direction holder while a case may be selected.
  readonly onSelect?: (caseNumber: number) => void;
}

export function CaseToken({ view, spot, away, onSelect }: CaseTokenProps) {
  const owner = view.ownerName ?? 'no owner';
  const label = `Case ${String(view.number)}, ${owner}${view.opened ? ', opened' : ''}`;
  // --roll-index staggers the cases rolling in during the opening (./moments.css).
  const style = {
    '--x': `${String(spot.x)}%`,
    '--y': `${String(spot.y)}%`,
    '--roll-index': view.number,
  } as CSSProperties;
  const body = (
    <>
      <span className="case-number show-font">{view.number}</span>
      <span className="case-owner" title={owner}>
        {owner}
      </span>
      {view.artifact !== null && <ArtifactEmblem artifact={view.artifact} />}
    </>
  );
  const className = `case-token${away ? ' is-away' : ''}${view.opened ? ' is-opened' : ''}`;
  return (
    <li className={className} style={style} data-case={view.number}>
      {onSelect !== undefined && !view.opened ? (
        <button
          type="button"
          className="case-body"
          title={`Select case ${String(view.number)}`}
          aria-label={`Select ${label}`}
          onClick={() => {
            onSelect(view.number);
          }}
        >
          {body}
        </button>
      ) : (
        <div className="case-body" aria-label={label}>
          {body}
        </div>
      )}
    </li>
  );
}
