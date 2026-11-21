/**
 * @file   packages/application/src/shows.test.ts
 * @brief  Tests the use cases: the whole show through the service, Quick Test from a seed,
 *         the listener, refusals and unknown shows, and the rebuild from the log.
 */
import { randomBytes, randomInt } from 'node:crypto';

import { publicView, seededRandom, type Actor } from '@sc/domain';
import { describe, expect, it } from 'vitest';

import { memoryStore } from './eventLog.js';
import type { EventStore, RandomSource } from './ports.js';
import { createShowService, type ShowService } from './shows.js';

const MOD: Actor = { id: 'mod-1', name: 'Mia' };
const MOD2: Actor = { id: 'mod-2', name: 'Noah' };

const random: RandomSource = {
  secure: () => ({ int: (max) => randomInt(max), hex: (n) => randomBytes(n).toString('hex') }),
  seeded: seededRandom,
};

function service(store: EventStore = memoryStore(), onChange?: () => void): ShowService {
  let tick = 0;
  let id = 0;
  return createShowService({
    clock: { now: () => new Date(Date.UTC(2026, 10, 21, 20, 0, tick++)).toISOString() },
    ids: { showId: () => `show-${String(++id)}` },
    random,
    store,
    ...(onChange === undefined ? {} : { onChange }),
  });
}

const setup = { cases: 12, winners: 3, labels: ['Gold'] };

describe('the show use cases', () => {
  it('run a show from creation to the end', () => {
    const shows = service();
    const created = shows.createShow(MOD, setup);
    if (!created.ok) throw new Error(created.error);
    const id = created.model.id;
    expect(created.model.prizes[0]?.season).toBe('all');
    expect(created.model.blank.season).toBe('autumn');
    expect(shows.openRegistration(id, MOD.id).ok).toBe(true);
    expect(shows.claim(id, { id: 'ana', name: 'Ana' }, 4, 7).ok).toBe(true);
    expect(shows.fillWithBots(id).ok).toBe(true);
    expect(shows.closeRegistration(id, MOD.id).ok).toBe(true);
    expect(shows.seal(id, MOD.id).ok).toBe(true);
    expect(shows.start(id, MOD).ok).toBe(true);
    expect(shows.select(id, MOD.id, 7).ok).toBe(true);
    for (const step of ['tension', 'open', 'prize', 'owner', 'return'] as const) {
      expect(shows.step(id, MOD.id, step).ok).toBe(true);
    }
    expect(shows.handOver(id, MOD.id, MOD2).ok).toBe(true);
    const ended = shows.endShow(id, MOD2.id);
    if (!ended.ok) throw new Error(ended.error);
    expect(publicView(ended.model).result?.verified).toBe(true);
    expect(shows.list().map((m) => m.id)).toEqual([id]);
  });

  it('answer an unknown show as not found and a refused command with its reason', () => {
    const shows = service();
    expect(shows.openRegistration('nope', MOD.id)).toMatchObject({ ok: false, notFound: true });
    expect(shows.createShow(MOD, { cases: 1, winners: 1, labels: [] })).toMatchObject({
      ok: false,
      notFound: false,
    });
    const created = shows.createShow(MOD, setup);
    if (!created.ok) throw new Error(created.error);
    expect(shows.claim(created.model.id, MOD, 1, 1)).toMatchObject({
      ok: false,
      error: 'registration is not open',
    });
  });

  it('tell the listener after every accepted use case', () => {
    let calls = 0;
    const shows = service(memoryStore(), () => (calls += 1));
    const created = shows.createShow(MOD, setup);
    if (!created.ok) throw new Error(created.error);
    shows.openRegistration(created.model.id, MOD.id);
    shows.openRegistration(created.model.id, MOD.id);
    expect(calls).toBe(2);
  });
});

describe('quickTest', () => {
  it('builds a live show with bots in every case and the caller as direction holder', () => {
    const outcome = service().quickTest({ ...setup, seed: 'sc-n1-01' }, MOD);
    if (!outcome.ok) throw new Error(outcome.error);
    const { model } = outcome;
    expect(model.state).toBe('live');
    expect(model.holder).toEqual(MOD);
    expect(model.owners?.every((o) => o?.player.id.startsWith('bot-'))).toBe(true);
  });

  it('gives the same show for the same seed', () => {
    const a = service().quickTest({ ...setup, seed: 'sc-n1-01' }, MOD);
    const b = service().quickTest({ ...setup, seed: 'sc-n1-01' }, MOD);
    const c = service().quickTest({ ...setup, seed: 'other' }, MOD);
    if (!a.ok || !b.ok || !c.ok) throw new Error('quick test refused');
    expect(b.model.sealing).toEqual(a.model.sealing);
    expect(b.model.owners).toEqual(a.model.owners);
    expect(c.model.sealing?.commitment).not.toBe(a.model.sealing?.commitment);
  });

  it('refuses an invalid setup', () => {
    expect(service().quickTest({ cases: 3, winners: 4, labels: [], seed: 's' }, MOD).ok).toBe(
      false,
    );
  });
});

describe('rebuild on start', () => {
  it('folds every logged show back to the state it had', () => {
    const store = memoryStore();
    const first = service(store);
    const outcome = first.quickTest({ ...setup, seed: 'sc-n1-01' }, MOD);
    if (!outcome.ok) throw new Error(outcome.error);
    first.select(outcome.model.id, MOD.id, 3);
    const again = service(store);
    expect(again.get(outcome.model.id)).toEqual(first.get(outcome.model.id));
  });
});
