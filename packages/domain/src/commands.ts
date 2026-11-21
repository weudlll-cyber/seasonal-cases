/**
 * @file   packages/domain/src/commands.ts
 * @brief  The show's commands and `decide`: which events a command produces in a state.
 *
 * Responsibility: check a command against the state and answer with its events or the reason
 *                 it is refused; never change state itself (./model.ts folds the events). The
 *                 clock's time `at` and the random port arrive inside the command.
 * Depends on:     @sc/contracts (types), ./events.js, ./model.js, ./live.js, ./registration.js,
 *                 ./sealing.js, ./setup.js, ./settings.js, ./random.js
 */
import type { DirectionStep, Rank, Season } from '@sc/contracts';

import type { Actor } from './events.js';
import {
  accept,
  decideEnd,
  decideHandOver,
  decideSelect,
  decideStep,
  refuse,
  type Decision,
} from './live.js';
import type { ShowModel } from './model.js';
import type { RandomPort } from './random.js';
import { botClaims } from './registration.js';
import { seal } from './sealing.js';
import type { ShowSettings } from './settings.js';
import { artifactTable, prizeSlots, setupProblem } from './setup.js';

export interface CreateCommand {
  readonly type: 'create';
  readonly at: string;
  readonly showId: string;
  readonly by: Actor;
  readonly cases: number;
  readonly winners: number;
  readonly labels: readonly string[];
  readonly season: Season;
  readonly settings: ShowSettings;
}

export type ShowCommand =
  | { readonly type: 'openRegistration'; readonly at: string; readonly by: string }
  | {
      readonly type: 'claim';
      readonly at: string;
      readonly player: Actor;
      readonly rank: Rank;
      readonly caseNumber: number;
    }
  | { readonly type: 'closeRegistration'; readonly at: string; readonly by: string }
  | { readonly type: 'fillWithBots'; readonly at: string; readonly random: RandomPort }
  | { readonly type: 'seal'; readonly at: string; readonly by: string; readonly random: RandomPort }
  | { readonly type: 'start'; readonly at: string; readonly by: Actor }
  | {
      readonly type: 'select';
      readonly at: string;
      readonly by: string;
      readonly caseNumber: number;
    }
  | {
      readonly type: 'step';
      readonly at: string;
      readonly by: string;
      readonly step: DirectionStep;
    }
  | { readonly type: 'handOver'; readonly at: string; readonly by: string; readonly to: Actor }
  | { readonly type: 'end'; readonly at: string; readonly by: string };

/** The first event of a show, or the reason the setup is refused. */
export function decideCreate(command: CreateCommand): Decision {
  const { at, showId, by, cases, winners, labels } = command;
  const problem = setupProblem({ cases, winners, labels });
  if (problem !== null) return refuse(problem);
  const { prizes, blank } = artifactTable(command.settings, winners, command.season);
  return accept({
    type: 'created',
    at,
    showId,
    by,
    caseCount: cases,
    prizeSlots: prizeSlots(winners, labels),
    prizes,
    blank,
  });
}

type Of<T extends ShowCommand['type']> = Extract<ShowCommand, { type: T }>;
type Handlers = { [T in ShowCommand['type']]: (model: ShowModel, command: Of<T>) => Decision };

const HANDLERS: Handlers = {
  openRegistration: (model, { at, by }) =>
    model.state === 'setup'
      ? accept({ type: 'registrationOpened', at, by })
      : refuse('registration opens only once, from setup'),
  claim: (model, { at, player, rank, caseNumber }) => {
    if (!model.registrationOpen) return refuse('registration is not open');
    if (!Number.isInteger(caseNumber) || caseNumber < 1 || caseNumber > model.caseCount) {
      return refuse('there is no such case');
    }
    return accept({ type: 'claimed', at, player, rank, caseNumber });
  },
  closeRegistration: (model, { at, by }) =>
    model.registrationOpen
      ? accept({ type: 'registrationClosed', at, by })
      : refuse('registration is not open'),
  fillWithBots: (model, { at, random }) =>
    model.registrationOpen
      ? accept(...botClaims(model.claims, model.caseCount, random, at))
      : refuse('registration is not open'),
  seal: (model, { at, by, random }) => {
    if (model.state !== 'registration' || model.registrationOpen) {
      return refuse('a show is sealed once registration is closed');
    }
    const sealed = seal(model.caseCount, model.prizes.length, random);
    return accept({ type: 'sealed', at, by, ...sealed });
  },
  start: (model, { at, by }) =>
    model.state === 'sealed'
      ? accept({ type: 'started', at, by })
      : refuse('only a sealed show can start'),
  select: decideSelect,
  step: decideStep,
  handOver: decideHandOver,
  end: decideEnd,
};

/** The events a command produces in this state, or the reason it is refused. */
export function decide(model: ShowModel, command: ShowCommand): Decision {
  if (model.state === 'ended') return refuse('the show has ended');
  const handler = HANDLERS[command.type] as (model: ShowModel, command: ShowCommand) => Decision;
  return handler(model, command);
}
