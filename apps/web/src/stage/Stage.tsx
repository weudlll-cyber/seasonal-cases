/**
 * @file   apps/web/src/stage/Stage.tsx
 * @brief  The stage: every case on the half circle, the scoreboard, the opening, the case at the
 *         front with the lower third, the ceremony after the end, and the direction bar for the
 *         direction holder only (CONCEPT §3.4, §7).
 *
 * Responsibility: render the show's view; the stage is the same for everyone, and only the
 *                 direction holder gets the bar, "Begin" and clickable cases (once begun). The
 *                 screen scales down evenly where there is no room (the kit's `useFitScale`, the
 *                 cases' floors of `data-sk-game="cases"`) and keeps the dock's height free
 *                 (DECISIONS D7); the cases sit in a named scroll area that takes what does not
 *                 fit. On a phone the bar lives in the game bar's direction panel (`barInline`).
 *                 The applause count shows once someone claps, and the confetti grows with it.
 * Depends on:     react, @seasonal/kit/react, @sc/contracts (types), @sc/ui, ./applause.js, ./arc.js,
 *                 ./CaseToken.js, ./CentreStage.js, ./Ceremony.js, ./DirectionBar.js,
 *                 ./LowerThird.js, ./motion.js, ./Opening.js, ./Scoreboard.js, ./travel.js
 */
import { useDockReserve, useFitScale } from '@seasonal/kit/react';
import type {
  Ack,
  Applause,
  ClientToServerEvents,
  Me,
  OrganiserView,
  PublicShowView,
} from '@sc/contracts';
import type { CSSProperties } from 'react';

import { useApplauseStep, type ApplauseStep } from './applause.js';
import { arcSpots, tokenSize } from './arc.js';
import { CaseToken } from './CaseToken.js';
import { CentreStage } from './CentreStage.js';
import { Ceremony } from './Ceremony.js';
import { DirectionBar } from './DirectionBar.js';
import { Confetti, LowerThird } from './LowerThird.js';
import { motionOf, motionVars } from './motion.js';
import { Opening } from './Opening.js';
import { Scoreboard } from './Scoreboard.js';
import { useReturn } from './travel.js';

export type Direct = (event: keyof ClientToServerEvents, payload: object) => Promise<Ack>;

export interface StageProps {
  readonly show: PublicShowView;
  readonly organiser: OrganiserView | null;
  readonly me: Me | null;
  readonly direct: Direct;
  // False on a phone, where the bar sits in the game bar's direction panel.
  readonly barInline?: boolean;
  // The show's latest applause count (D39); the stage shows it and the confetti grows with it.
  readonly applause?: Applause | null;
}

function ApplauseCount({ applause }: { applause: Applause | null }) {
  if (applause === null || applause.total === 0) return null;
  return (
    <p className="applause-count" data-sk-fit-fixed title="Applause in this show" role="status">
      Applause {applause.total}
    </p>
  );
}

// Selecting another case is possible until the case is open (CONCEPT §3.4).
const SELECTABLE = new Set(['idle', 'selected']);

/** The direction holder's view while the show is live; null for everyone else. */
export function holderView(show: PublicShowView, organiser: OrganiserView | null, me: Me | null) {
  return show.state === 'live' && me !== null && organiser?.holder?.id === me.id ? organiser : null;
}

function StateNote({ show }: { show: PublicShowView }) {
  if (show.state !== 'sealed' && show.state !== 'registration' && show.state !== 'setup') {
    return null;
  }
  const text =
    show.state === 'sealed'
      ? 'The cases are sealed. The show starts soon.'
      : 'Registration: pick your case on the start page.';
  return (
    <p className="stage-note" data-sk-fit-fixed>
      {text}
    </p>
  );
}

/** What stands in the middle of the stage: the opening, the front case, or the ceremony. */
function Middle(props: {
  show: PublicShowView;
  returning: number | null;
  step: ApplauseStep;
  begin?: () => Promise<Ack>;
}) {
  const { show, returning, step, begin } = props;
  if (show.state === 'ended' && show.result !== null) {
    return (
      <Ceremony
        showId={show.id}
        result={show.result}
        confetti={show.presentation.confetti}
        applause={step}
      />
    );
  }
  if (show.state === 'live' && !show.live.begun) {
    return <Opening show={show} {...(begin === undefined ? {} : { onBegin: begin })} />;
  }
  return (
    <>
      <CentreStage show={show} returning={returning} />
      <LowerThird show={show} />
    </>
  );
}

/** The holder's two ways onto the stage: a click on a case (once begun) and Begin. */
function holderActions(show: PublicShowView, isHolder: boolean, direct: Direct) {
  if (!isHolder) return { onSelect: undefined, begin: undefined };
  const begin = () => direct('direction:begin', { showId: show.id });
  if (!show.live.begun || !SELECTABLE.has(show.live.step)) return { onSelect: undefined, begin };
  const onSelect = (caseNumber: number) => {
    void direct('direction:select', { showId: show.id, caseNumber });
  };
  return { onSelect, begin };
}

/** The stage's CSS variables: the motion's timings and the dock's height. */
function stageStyle(motion: ReturnType<typeof motionOf>, reserve: number): CSSProperties {
  return { ...motionVars(motion), '--dock-reserve': `${String(reserve)}px` } as CSSProperties;
}

export function Stage(props: StageProps) {
  const { show, organiser, me, direct, barInline = true, applause = null } = props;
  const reserve = useDockReserve();
  const cheer = useApplauseStep(applause);
  const { selected, step, begun } = show.live;
  const fitRef = useFitScale<HTMLElement>('cases', `${String(show.caseCount)}:${step}`, true);
  // The bar exists only while the show is live: after the end only "See the result" stays.
  const holder = holderView(show, organiser, me);
  const spots = arcSpots(show.caseCount);
  const { onSelect, begin } = holderActions(show, holder !== null, direct);
  const motion = motionOf(show.presentation);
  const returning = useReturn(selected, motion.travelMs);
  const style = stageStyle(motion, reserve);
  const arenaStyle = { '--token': `${String(tokenSize(show.caseCount))}px` } as CSSProperties;
  const opening = show.state === 'live' && !begun;
  return (
    <section
      className="stage-screen"
      data-sk-game="cases"
      data-step={step}
      data-season={show.season ?? undefined}
      data-dimmed={selected !== null || opening || show.state === 'ended'}
      data-opening={opening}
      ref={fitRef}
      style={style}
      aria-label="Stage"
    >
      <Scoreboard show={show} />
      <StateNote show={show} />
      <ApplauseCount applause={applause} />
      <div className="stage" data-sk-fit-fixed>
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
        <Middle
          show={show}
          returning={returning}
          step={cheer}
          {...(begin === undefined ? {} : { begin })}
        />
      </div>
      <Confetti show={show} step={cheer} />
      {holder !== null && me !== null && begun && barInline && (
        <DirectionBar view={holder} me={me} direct={direct} />
      )}
    </section>
  );
}
