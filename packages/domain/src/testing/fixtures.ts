/**
 * @file   packages/domain/src/testing/fixtures.ts
 * @brief  Test helpers: a ticking clock and a show driven through `decide` and the fold.
 *
 * Responsibility: let the domain's tests build a show step by step exactly as the application
 *                 does (decide, then fold the events), and fail loudly on a refused command.
 *                 Used by tests only; excluded from coverage (vitest.config.ts).
 * Depends on:     ../commands.js, ../model.js, ../events.js, ../settings.js
 */
import { decide, decideCreate, type ShowCommand } from '../commands.js';
import type { Actor, ShowEvent } from '../events.js';
import { applyEvent, foldShow, type ShowModel } from '../model.js';
import { DEFAULT_SETTINGS } from '../settings.js';

export const MOD: Actor = { id: 'mod-1', name: 'Mia' };
export const MOD2: Actor = { id: 'mod-2', name: 'Noah' };

/** ISO times one second apart from 2026-11-21 20:00 UTC. */
export function clock(): () => string {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 10, 21, 20, 0, tick++)).toISOString();
}

export interface Driver {
  readonly events: ShowEvent[];
  model(): ShowModel;
  /** Applies the command; throws with the reason if it is refused. */
  run(command: ShowCommand): ShowEvent[];
  /** The refusal's reason; throws if the command is accepted. */
  refused(command: ShowCommand): string;
}

export function newShow(cases: number, winners: number, labels: readonly string[] = []): Driver {
  const decision = decideCreate({
    type: 'create',
    at: '2026-11-21T19:59:00.000Z',
    showId: 'show-1',
    by: MOD,
    cases,
    winners,
    labels,
    season: 'autumn',
    settings: DEFAULT_SETTINGS,
  });
  if (!decision.ok) throw new Error(decision.error);
  const events = [...decision.events];
  let model = foldShow(events);
  return {
    events,
    model: () => model,
    run(command) {
      const d = decide(model, command);
      if (!d.ok) throw new Error(`${command.type} refused: ${d.error}`);
      for (const e of d.events) {
        events.push(e);
        model = applyEvent(model, e);
      }
      return [...d.events];
    },
    refused(command) {
      const d = decide(model, command);
      if (d.ok) throw new Error(`${command.type} was accepted`);
      return d.error;
    },
  };
}
