/**
 * @file   apps/web/src/stage/Stage.tsx
 * @brief  The live stage: every case on the half circle, the centre stage, the top bar, the
 *         lower third, and the direction bar for the direction holder only (CONCEPT §7).
 *
 * Responsibility: render the show's view; the stage is the same for everyone, and only the
 *                 direction holder gets the bar and clickable cases. The screen scales down
 *                 evenly where there is no room (the kit's `useFitScale`, the cases' floors of
 *                 `data-sk-game="cases"`) and keeps the dock's height free (DECISIONS D7);
 *                 the cases sit in a named scroll area that takes what does not fit.
 * Depends on:     react, @seasonal/kit/react, @sc/contracts (types), @sc/ui, ../lib/router.js,
 *                 ./arc.js, ./CaseToken.js, ./CentreStage.js, ./Scoreboard.js, ./LowerThird.js,
 *                 ./DirectionBar.js
 */
import { useFitScale } from '@seasonal/kit/react';
import type { Ack, ClientToServerEvents, Me, ModeratorView, PublicShowView } from '@sc/contracts';
import { useDockReserve } from '@sc/ui';
import type { CSSProperties } from 'react';

import { Link } from '../lib/router.js';
import { arcSpots, tokenSize } from './arc.js';
import { CaseToken } from './CaseToken.js';
import { CentreStage } from './CentreStage.js';
import { motionVars } from './motion.js';
import { useReturn } from './travel.js';
import { DirectionBar } from './DirectionBar.js';
import { Confetti, LowerThird } from './LowerThird.js';
import { Scoreboard } from './Scoreboard.js';

export interface StageProps {
  readonly show: PublicShowView;
  readonly moderator: ModeratorView | null;
  readonly me: Me | null;
  readonly direct: (event: keyof ClientToServerEvents, payload: object) => Promise<Ack>;
}

// Selecting another case is possible until the case is open (CONCEPT §3.4).
const SELECTABLE = new Set(['idle', 'selected']);

function StateNote({ show }: { show: PublicShowView }) {
  if (show.state === 'live') return null;
  if (show.state === 'ended') {
    return (
      <p className="stage-note" data-fit-fixed>
        The show has ended. <Link to={`/results/${show.id}`}>See the result</Link>
      </p>
    );
  }
  const text =
    show.state === 'sealed'
      ? 'The cases are sealed. The show starts soon.'
      : 'Registration: pick your case in the lobby.';
  return (
    <p className="stage-note" data-fit-fixed>
      {text}
    </p>
  );
}

export function Stage({ show, moderator, me, direct }: StageProps) {
  const reserve = useDockReserve();
  const { selected, step } = show.live;
  const fitRef = useFitScale<HTMLElement>('mini-games', `${String(show.caseCount)}:${step}`, true);
  // The bar exists only while the show is live: after the end only "See the result" stays.
  const holder =
    show.state === 'live' && me !== null && moderator?.holder?.id === me.id ? moderator : null;
  const spots = arcSpots(show.caseCount);
  const onSelect =
    holder !== null && SELECTABLE.has(step)
      ? (caseNumber: number) => {
          void direct('direction:select', { showId: show.id, caseNumber });
        }
      : undefined;
  const returning = useReturn(selected);
  const style = { ...motionVars(), '--dock-reserve': `${String(reserve)}px` } as CSSProperties;
  const arenaStyle = { '--token': `${String(tokenSize(show.caseCount))}px` } as CSSProperties;
  return (
    <section
      className="stage-screen"
      data-sk-game="cases"
      data-step={step}
      data-dimmed={selected !== null}
      ref={fitRef}
      style={style}
      aria-label="Stage"
    >
      <Scoreboard show={show} />
      <StateNote show={show} />
      <div className="stage" data-fit-fixed>
        <div className="spotlight" aria-hidden="true" />
        <div className="arena-scroll" role="region" aria-label="Cases" tabIndex={0}>
          <ol className="arena" style={arenaStyle}>
            {show.cases.map((c, i) => (
              <CaseToken
                key={c.number}
                view={c}
                spot={spots[i] ?? { x: 50, y: 50 }}
                away={c.number === selected || c.number === returning}
                {...(onSelect === undefined ? {} : { onSelect })}
              />
            ))}
          </ol>
        </div>
        <CentreStage show={show} returning={returning} />
        <LowerThird show={show} />
      </div>
      <Confetti show={show} />
      {holder !== null && me !== null && <DirectionBar view={holder} me={me} direct={direct} />}
    </section>
  );
}
