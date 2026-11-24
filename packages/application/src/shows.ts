/**
 * @file   packages/application/src/shows.ts
 * @brief  The use cases of a show over the in-memory store and the event log.
 *
 * Responsibility: run each use case as "decide, append to the log, fold into memory, tell
 *                 the listener". On start every show is rebuilt from its logged events. The
 *                 Quick Test builds a live show in one call from a seed (CONCEPT §9). Role
 *                 checks belong to the server; the direction holder is the domain's rule.
 * Depends on:     @sc/domain, ./ports.js, ./season.js
 */
import {
  applyEvent,
  decide,
  decideCreate,
  DEFAULT_SETTINGS,
  foldShow,
  type Actor,
  type Decision,
  type RandomPort,
  type ShowCommand,
  type ShowModel,
  type ShowSettings,
} from '@sc/domain';

import type { DirectionStep } from '@sc/contracts';

import type { Clock, EventStore, IdSource, RandomSource } from './ports.js';
import { seasonOf } from './season.js';

export type Outcome =
  | { readonly ok: true; readonly model: ShowModel }
  | { readonly ok: false; readonly error: string; readonly notFound: boolean };

export interface ShowSetup {
  readonly cases: number;
  readonly winners: number;
  readonly labels: readonly string[];
  // Listed on the website's open sign-ups while registration is open (OPEN-ROUNDS.md).
  readonly listed?: boolean;
}

export interface ShowDeps {
  readonly clock: Clock;
  readonly ids: IdSource;
  readonly random: RandomSource;
  readonly store: EventStore;
  // The settings at this moment: read at every creation, so a change applies to new shows only.
  readonly settings?: () => ShowSettings;
  /** Called after every accepted use case with the show's new state. */
  readonly onChange?: (model: ShowModel) => void;
}

type Step = DirectionStep;

export interface ShowService {
  list(): ShowModel[];
  get(showId: string): ShowModel | undefined;
  createShow(by: Actor, setup: ShowSetup): Outcome;
  openRegistration(showId: string, by: string): Outcome;
  claim(showId: string, player: Actor, rank: number, caseNumber: number): Outcome;
  closeRegistration(showId: string, by: string): Outcome;
  fillWithBots(showId: string, random?: RandomPort): Outcome;
  seal(showId: string, by: string, random?: RandomPort): Outcome;
  start(showId: string, by: Actor): Outcome;
  begin(showId: string, by: string): Outcome;
  select(showId: string, by: string, caseNumber: number): Outcome;
  step(showId: string, by: string, step: Step): Outcome;
  handOver(showId: string, by: string, to: Actor): Outcome;
  endShow(showId: string, by: string): Outcome;
  quickTest(setup: ShowSetup & { readonly seed: string }, organiser: Actor): Outcome;
  /**
   * Takes a deleted player's name out of every show (D61): the logs are rewritten, the shows they
   * appear in are folded again and announced through `onChange`. Answers how many shows changed.
   */
  forget(playerId: string, name: string): number;
}

const missing = (showId: string): Outcome => ({
  ok: false,
  error: `there is no show ${showId}`,
  notFound: true,
});

/**
 * Takes a deleted player's name out of the stored logs, folds the shows they appear in again and
 * announces each one (`ShowService.forget`).
 */
function forgetPlayer(
  deps: ShowDeps,
  models: Map<string, ShowModel>,
  playerId: string,
  name: string,
): number {
  const changed = deps.store.redact(playerId, name);
  const logs = deps.store.loadAll();
  for (const showId of changed) {
    const events = logs.get(showId);
    if (events === undefined) continue;
    const model = foldShow(events);
    models.set(showId, model);
    deps.onChange?.(model);
  }
  return changed.length;
}

/** Newest first; shows created in the same millisecond keep their creation order, reversed. */
const newestFirst = (models: ReadonlyMap<string, ShowModel>): ShowModel[] =>
  [...models.values()].reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function createShowService(deps: ShowDeps): ShowService {
  const { clock, ids, random, store } = deps;
  const settingsNow = deps.settings ?? (() => DEFAULT_SETTINGS);
  // The rebuild: every show is a fold over its logged events.
  const models = new Map<string, ShowModel>();
  for (const [showId, events] of store.loadAll()) models.set(showId, foldShow(events));

  // Appends what the domain decided, folds it in and tells the listener.
  const commit = (showId: string, decision: Decision, current?: ShowModel): Outcome => {
    if (!decision.ok) return { ok: false, error: decision.error, notFound: false };
    store.append(showId, decision.events);
    let model = current;
    for (const event of decision.events) {
      model = model === undefined ? foldShow([event]) : applyEvent(model, event);
    }
    if (model === undefined) throw new Error('a decision without events');
    models.set(showId, model);
    deps.onChange?.(model);
    return { ok: true, model };
  };

  const run = (showId: string, command: (at: string) => ShowCommand): Outcome => {
    const model = models.get(showId);
    if (model === undefined) return missing(showId);
    return commit(showId, decide(model, command(clock.now())), model);
  };

  const service: ShowService = {
    list: () => newestFirst(models),
    get: (showId) => models.get(showId),
    createShow(by, setup) {
      const at = clock.now();
      const showId = ids.showId();
      const season = seasonOf(at);
      return commit(
        showId,
        decideCreate({ type: 'create', at, showId, by, ...setup, season, settings: settingsNow() }),
      );
    },
    openRegistration: (id, by) => run(id, (at) => ({ type: 'openRegistration', at, by })),
    claim: (id, player, rank, caseNumber) =>
      run(id, (at) => ({ type: 'claim', at, player, rank, caseNumber })),
    closeRegistration: (id, by) => run(id, (at) => ({ type: 'closeRegistration', at, by })),
    fillWithBots: (id, port = random.secure()) =>
      run(id, (at) => ({ type: 'fillWithBots', at, random: port })),
    seal: (id, by, port = random.secure()) =>
      run(id, (at) => ({ type: 'seal', at, by, random: port })),
    start: (id, by) => run(id, (at) => ({ type: 'start', at, by })),
    begin: (id, by) => run(id, (at) => ({ type: 'begin', at, by })),
    select: (id, by, caseNumber) => run(id, (at) => ({ type: 'select', at, by, caseNumber })),
    step: (id, by, step) => run(id, (at) => ({ type: 'step', at, by, step })),
    handOver: (id, by, to) => run(id, (at) => ({ type: 'handOver', at, by, to })),
    endShow: (id, by) => run(id, (at) => ({ type: 'end', at, by })),
    quickTest: ({ seed, ...setup }, organiser) =>
      quickTest(service, setup, organiser, random.seeded(seed)),
    forget: (playerId, name) => forgetPlayer(deps, models, playerId, name),
  };
  return service;
}

/**
 * Creates the show, fills every case with bots, closes registration, seals and starts it
 * with the caller as direction holder. One seeded stream draws the bots and the sealing, so
 * the same seed gives the same show.
 */
function quickTest(
  shows: ShowService,
  setup: ShowSetup,
  organiser: Actor,
  port: RandomPort,
): Outcome {
  const created = shows.createShow(organiser, setup);
  if (!created.ok) return created;
  const id = created.model.id;
  const steps: (() => Outcome)[] = [
    () => shows.openRegistration(id, organiser.id),
    () => shows.fillWithBots(id, port),
    () => shows.closeRegistration(id, organiser.id),
    () => shows.seal(id, organiser.id, port),
    () => shows.start(id, organiser),
  ];
  let outcome: Outcome = created;
  for (const next of steps) {
    outcome = next();
    if (!outcome.ok) return outcome;
  }
  return outcome;
}
