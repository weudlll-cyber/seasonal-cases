/**
 * @file   apps/web/src/stage/DirectionBar.tsx
 * @brief  The direction holder's narrow bar: the next steps, hand-over and end (CONCEPT §3.4).
 *
 * Responsibility: one button per step after the click on a case (Open, Owner, Back to stage),
 *                 each enabled when it is the next one; "Hand over" to an organiser watching the show;
 *                 "End show" (./EndShow.tsx), highlighted once every prize is found and asking
 *                 first while prizes are hidden. Every click goes to the server, whose ack or
 *                 refusal is shown; the server decides.
 * Depends on:     react, @sc/contracts (types), ../lib/useAction.js, ./EndShow.js
 */
import type { Ack, DirectionStep, Me, OrganiserView, RevealStep } from '@sc/contracts';
import { useState } from 'react';

import { useAction, type Action } from '../lib/useAction.js';
import { EndShow } from './EndShow.js';

type Direct = (
  event: 'direction:step' | 'direction:handOver' | 'direction:end',
  payload: object,
) => Promise<Ack>;

// Each button, the step it follows, and its tooltip.
const BUTTONS: readonly { step: DirectionStep; after: RevealStep; label: string; tip: string }[] = [
  {
    step: 'open',
    after: 'selected',
    label: 'Open',
    tip: 'Open the case: its artifact and meaning appear',
  },
  { step: 'owner', after: 'open', label: 'Owner', tip: 'Show whose case it is' },
  { step: 'return', after: 'owner', label: 'Back to stage', tip: 'Return the case as opened' },
];

interface PartProps {
  readonly view: OrganiserView;
  readonly me: Me;
  readonly direct: Direct;
  readonly action: Action;
}

/** The organisers watching this show, but me, and the button that hands over to one. */
function HandOver({ view, me, direct, action }: PartProps) {
  const others = view.organisers.filter((m) => m.id !== me.id);
  const [to, setTo] = useState('');
  const target = others.find((m) => m.id === to) ?? others[0];
  return (
    <span className="direction-handover">
      <select
        className="sk-select"
        aria-label="Organiser to hand over to"
        title="An organiser watching this show"
        value={target?.id ?? ''}
        disabled={others.length === 0}
        onChange={(e) => {
          setTo(e.target.value);
        }}
      >
        {others.length === 0 && <option value="">no other organiser here</option>}
        {others.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="sk-btn"
        title="Give the direction to the chosen organiser"
        disabled={target === undefined || action.busy}
        onClick={() => {
          if (target === undefined) return;
          action.run(() =>
            direct('direction:handOver', { showId: view.show.id, toOrganiserId: target.id }),
          );
        }}
      >
        Hand over
      </button>
    </span>
  );
}

export function DirectionBar({ view, me, direct }: Omit<PartProps, 'action'>) {
  const action = useAction();
  const { show } = view;
  return (
    <nav className="direction-bar" aria-label="Direction" data-sk-fit-fixed>
      <span className="direction-hint">
        {show.live.step === 'idle'
          ? 'Click a case to select it'
          : `Case ${String(show.live.selected)}`}
      </span>
      {BUTTONS.map((b) => (
        <button
          key={b.step}
          type="button"
          className="sk-btn"
          title={b.tip}
          disabled={action.busy || show.live.step !== b.after}
          onClick={() => {
            action.run(() => direct('direction:step', { showId: show.id, step: b.step }));
          }}
        >
          {b.label}
        </button>
      ))}
      <HandOver view={view} me={me} direct={direct} action={action} />
      <EndShow
        show={show}
        end={() => direct('direction:end', { showId: show.id })}
        action={action}
      />
      {action.error !== null && (
        <span className="direction-error" role="alert">
          {action.error}
        </span>
      )}
    </nav>
  );
}
