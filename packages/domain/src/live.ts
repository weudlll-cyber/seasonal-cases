/**
 * @file   packages/domain/src/live.ts
 * @brief  The live show's rules: the direction holder, the steps, hand-over and the end.
 *
 * Responsibility: decide the live commands (CONCEPT §3.4, §3.5). Only the direction holder
 *                 acts. Select (the click on a case) works before "Open" and may change to
 *                 another unopened case; open, owner and return follow each other in order; "return" puts the case back on
 *                 the stage as opened. End is allowed at any moment of the live show.
 * Depends on:     @sc/contracts (types), ./events.js, ./model.js
 */
import type { DirectionStep, RevealStep } from '@sc/contracts';

import type { Actor, ShowEvent } from './events.js';
import type { ShowModel } from './model.js';

export type Decision =
  | { readonly ok: true; readonly events: readonly ShowEvent[] }
  | { readonly ok: false; readonly error: string };

export const refuse = (error: string): Decision => ({ ok: false, error });
export const accept = (...events: ShowEvent[]): Decision => ({ ok: true, events });

// The step each step must follow.
const AFTER: Record<DirectionStep, RevealStep> = {
  open: 'selected',
  owner: 'open',
  return: 'owner',
};

// Select may still change the case until it is open.
const BEFORE_OPEN: readonly RevealStep[] = ['idle', 'selected'];

/** Null when `by` may direct the live show now, else the reason. */
export function directionProblem(model: ShowModel, by: string): string | null {
  if (model.state !== 'live') return 'the show is not live';
  if (model.holder?.id !== by) return 'only the direction holder can do this';
  return null;
}

export function decideSelect(
  model: ShowModel,
  { at, by, caseNumber }: { at: string; by: string; caseNumber: number },
): Decision {
  const problem = directionProblem(model, by);
  if (problem !== null) return refuse(problem);
  if (!BEFORE_OPEN.includes(model.step))
    return refuse('the open case must return to the stage first');
  if (!Number.isInteger(caseNumber) || caseNumber < 1 || caseNumber > model.caseCount) {
    return refuse('there is no such case');
  }
  if (model.opened.includes(caseNumber)) return refuse('this case is already open');
  return accept({ type: 'selected', at, by, caseNumber });
}

export function decideStep(
  model: ShowModel,
  { at, by, step }: { at: string; by: string; step: DirectionStep },
): Decision {
  const problem = directionProblem(model, by);
  if (problem !== null) return refuse(problem);
  if (model.step !== AFTER[step]) return refuse(`"${step}" comes after "${AFTER[step]}"`);
  return accept({ type: 'stepped', at, by, step });
}

export function decideHandOver(
  model: ShowModel,
  { at, by, to }: { at: string; by: string; to: Actor },
): Decision {
  const problem = directionProblem(model, by);
  if (problem !== null) return refuse(problem);
  if (to.id === by) return refuse('you already hold the direction');
  return accept({ type: 'handedOver', at, by, to });
}

export function decideEnd(model: ShowModel, { at, by }: { at: string; by: string }): Decision {
  const problem = directionProblem(model, by);
  return problem === null ? accept({ type: 'ended', at, by }) : refuse(problem);
}
