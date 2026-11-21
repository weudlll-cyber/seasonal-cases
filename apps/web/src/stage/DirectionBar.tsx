/**
 * @file   apps/web/src/stage/DirectionBar.tsx
 * @brief  The direction holder's narrow bar: the next steps, hand-over and end (CONCEPT §3.4).
 *
 * Responsibility: one button per step after the click on a case (Open, Owner, Back to stage),
 *                 each enabled when it is the next one; "Hand over" to a moderator watching the show;
 *                 "End show", highlighted once every prize is found. Every click goes to the
 *                 server, whose ack or refusal is shown; the server decides.
 * Depends on:     react, @sc/contracts (types), ../lib/useAction.js
 */
import type { Ack, DirectionStep, Me, ModeratorView, RevealStep } from '@sc/contracts';
import { useState } from 'react';

import { useAction, type Action } from '../lib/useAction.js';

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
  readonly view: ModeratorView;
  readonly me: Me;
  readonly direct: Direct;
  readonly action: Action;
}

/** The moderators watching this show, but me, and the button that hands over to one. */
function HandOver({ view, me, direct, action }: PartProps) {
  const others = view.moderators.filter((m) => m.id !== me.id);
  const [to, setTo] = useState('');
  const target = others.find((m) => m.id === to) ?? others[0];
  return (
    <span className="direction-handover">
      <select
        aria-label="Moderator to hand over to"
        title="A moderator watching this show"
        value={target?.id ?? ''}
        disabled={others.length === 0}
        onChange={(e) => {
          setTo(e.target.value);
        }}
      >
        {others.length === 0 && <option value="">no other moderator here</option>}
        {others.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="button"
        title="Give the direction to the chosen moderator"
        disabled={target === undefined || action.busy}
        onClick={() => {
          if (target === undefined) return;
          action.run(() =>
            direct('direction:handOver', { showId: view.show.id, toModeratorId: target.id }),
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
    <nav className="direction-bar" aria-label="Direction" data-fit-fixed>
      <span className="direction-hint">
        {show.live.step === 'idle'
          ? 'Click a case to select it'
          : `Case ${String(show.live.selected)}`}
      </span>
      {BUTTONS.map((b) => (
        <button
          key={b.step}
          type="button"
          className="button"
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
      <button
        type="button"
        className={`button button-end${show.allPrizesFound ? ' is-ready' : ''}`}
        title={show.allPrizesFound ? 'Every prize is found: end the show' : 'End the show now'}
        disabled={action.busy}
        onClick={() => {
          action.run(() => direct('direction:end', { showId: show.id }));
        }}
      >
        End show
      </button>
      {action.error !== null && (
        <span className="direction-error" role="alert">
          {action.error}
        </span>
      )}
    </nav>
  );
}
