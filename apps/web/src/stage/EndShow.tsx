/**
 * @file   apps/web/src/stage/EndShow.tsx
 * @brief  The direction bar's "End show", which asks once before an early end (DECISIONS D33).
 *
 * Responsibility: with every prize found the show ends at once, the button highlighted; with
 *                 prizes still hidden the first press asks, naming how many are hidden, and
 *                 "End now" ends it while "Keep playing" goes back. The same in the bar under
 *                 the stage and in the phone's direction panel. The server decides the end.
 * Depends on:     react, @sc/contracts (types), ../lib/useAction.js, ./facts.js
 */
import type { Ack, PublicShowView } from '@sc/contracts';
import { useState } from 'react';

import type { Action } from '../lib/useAction.js';
import { showFacts } from './facts.js';

export interface EndShowProps {
  readonly show: PublicShowView;
  readonly end: () => Promise<Ack>;
  readonly action: Action;
}

const hiddenText = (n: number): string =>
  `${String(n)} ${n === 1 ? 'prize is' : 'prizes are'} still hidden. End the show now?`;

export function EndShow({ show, end, action }: EndShowProps) {
  const [asking, setAsking] = useState(false);
  const { prizesLeft } = showFacts(show);
  const finish = (): void => {
    setAsking(false);
    action.run(end);
  };
  if (asking && prizesLeft > 0) {
    return (
      <span className="direction-confirm" role="group" aria-label="End the show early?">
        <span className="direction-confirm-text">{hiddenText(prizesLeft)}</span>
        <button
          type="button"
          className="sk-btn button-end"
          title="End the show; the ceremony reveals every prize"
          disabled={action.busy}
          onClick={finish}
        >
          End now
        </button>
        <button
          type="button"
          className="sk-btn"
          title="Go back to the show"
          onClick={() => {
            setAsking(false);
          }}
        >
          Keep playing
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`sk-btn button-end${show.allPrizesFound ? ' is-ready' : ''}`}
      title={show.allPrizesFound ? 'Every prize is found: end the show' : 'End the show now'}
      disabled={action.busy}
      onClick={() => {
        if (prizesLeft > 0) setAsking(true);
        else finish();
      }}
    >
      End show
    </button>
  );
}
