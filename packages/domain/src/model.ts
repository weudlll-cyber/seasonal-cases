/**
 * @file   packages/domain/src/model.ts
 * @brief  The show's state as a fold over its events.
 *
 * Responsibility: `applyEvent` turns one event into the next state; `foldShow` replays a whole
 *                 event list. No event is checked here: ./commands.ts decides which events may
 *                 happen, so a replayed log always folds to the state it had.
 * Depends on:     @sc/contracts (types), ./events.js, ./registration.js
 */
import type { Artifact, AssignmentEntry, PrizeSlot, RevealStep, ShowState } from '@sc/contracts';

import type { Actor, ShowEvent } from './events.js';
import { ownersAtClose, type Claim } from './registration.js';

export interface Sealing {
  readonly at: string;
  readonly by: string;
  readonly commitment: string;
  readonly assignment: readonly AssignmentEntry[];
  readonly secret: string;
}

export interface ShowModel {
  readonly id: string;
  readonly createdAt: string;
  readonly createdBy: Actor;
  readonly state: ShowState;
  readonly registrationOpen: boolean;
  readonly caseCount: number;
  readonly prizeSlots: readonly PrizeSlot[];
  readonly prizes: readonly Artifact[];
  readonly blank: Artifact;
  // Every claim in the order it was made; a player's latest one counts.
  readonly claims: readonly Claim[];
  // Index i: the owner of case i + 1 from the close of registration on.
  readonly owners: readonly (Claim | null)[] | null;
  readonly sealing: Sealing | null;
  readonly holder: Actor | null;
  readonly selected: number | null;
  readonly step: RevealStep;
  // Opened case numbers in the order they were opened.
  readonly opened: readonly number[];
  readonly endedAt: string | null;
}

type Created = Extract<ShowEvent, { type: 'created' }>;

function created(event: Created): ShowModel {
  return {
    id: event.showId,
    createdAt: event.at,
    createdBy: event.by,
    state: 'setup',
    registrationOpen: false,
    caseCount: event.caseCount,
    prizeSlots: event.prizeSlots,
    prizes: event.prizes,
    blank: event.blank,
    claims: [],
    owners: null,
    sealing: null,
    holder: null,
    selected: null,
    step: 'idle',
    opened: [],
    endedAt: null,
  };
}

// The reveal steps: how the stage changes with each one (CONCEPT §3.4).
function stepped(model: ShowModel, step: Extract<ShowEvent, { type: 'stepped' }>['step']) {
  if (step === 'return') return { ...model, selected: null, step: 'idle' as const };
  if (step === 'open' && model.selected !== null) {
    return { ...model, step, opened: [...model.opened, model.selected] };
  }
  return { ...model, step };
}

/** The state after one more event. */
export function applyEvent(model: ShowModel, event: ShowEvent): ShowModel {
  switch (event.type) {
    case 'created':
      return created(event);
    case 'registrationOpened':
      return { ...model, state: 'registration', registrationOpen: true };
    case 'claimed': {
      const claim: Claim = { ...event, seq: model.claims.length };
      return { ...model, claims: [...model.claims, claim] };
    }
    case 'registrationClosed':
      return {
        ...model,
        registrationOpen: false,
        owners: ownersAtClose(model.claims, model.caseCount),
      };
    case 'sealed': {
      const { type: _type, ...sealing } = event;
      return { ...model, state: 'sealed', sealing };
    }
    case 'started':
      return { ...model, state: 'live', holder: event.by };
    case 'selected':
      return { ...model, selected: event.caseNumber, step: 'selected' };
    case 'stepped':
      return stepped(model, event.step);
    case 'handedOver':
      return { ...model, holder: event.to };
    case 'ended':
      return { ...model, state: 'ended', endedAt: event.at };
  }
}

/** The state after a whole event list, which must start with 'created'. */
export function foldShow(events: readonly ShowEvent[]): ShowModel {
  const [first, ...rest] = events;
  if (first?.type !== 'created') throw new Error('a show starts with its "created" event');
  return rest.reduce(applyEvent, created(first));
}
