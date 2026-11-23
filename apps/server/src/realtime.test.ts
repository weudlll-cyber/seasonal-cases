/**
 * @file   apps/server/src/realtime.test.ts
 * @brief  Tests the socket side: every direction action authorised against the direction
 *         holder, the projections each socket receives, and the same-origin handshake.
 */
import type { OrganiserView, PersonalView, PublicShowView } from '@sc/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { send, startHarness, type Client, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

/** A live Quick Test show of 6 cases and 2 winners, directed by the organiser "Mia". */
async function liveShow(h: Harness) {
  const mia = await h.signIn('Mia', 'organiser');
  const { me } = mia;
  const outcome = h.server.shows.quickTest({ cases: 6, winners: 2, labels: [], seed: 'rt' }, me);
  if (!outcome.ok) throw new Error(outcome.error);
  // The opening is over: the direction holder said "Begin".
  h.server.shows.begin(outcome.model.id, me.id);
  return { id: outcome.model.id, mia };
}

/** Collects what a socket receives, by event. */
function record(socket: Client) {
  const seen = {
    public: [] as PublicShowView[],
    organiser: [] as OrganiserView[],
    personal: [] as PersonalView[],
  };
  socket.on('show:public', (v) => seen.public.push(v));
  socket.on('show:organiser', (v) => seen.organiser.push(v));
  socket.on('show:personal', (v) => seen.personal.push(v));
  return seen;
}

const STEPS = ['open', 'owner', 'return'] as const;

/** No payload holds the secret, the assignment or the content of an unopened case. */
function expectNoLeak(views: readonly PublicShowView[], secret: string): void {
  for (const view of views) {
    const text = JSON.stringify(view);
    expect(text).not.toContain(secret);
    expect(text).not.toContain('assignment');
    for (const c of view.cases) if (!c.opened) expect(c.artifact).toBeNull();
  }
}

describe('direction actions', () => {
  it('are refused for guests, players and organisers without the direction', async () => {
    harness = await startHarness();
    const { id, mia } = await liveShow(harness);
    const noah = await harness.signIn('Noah', 'organiser');
    const ana = await harness.signIn('Ana', 'player', 5);
    const actions = [
      ['direction:select', { showId: id, caseNumber: 1 }],
      ['direction:step', { showId: id, step: 'open' }],
      ['direction:handOver', { showId: id, toOrganiserId: noah.me.id }],
      ['direction:end', { showId: id }],
    ] as const;
    for (const cookie of [undefined, ana.cookie, noah.cookie]) {
      const socket = await harness.socket(cookie);
      expect((await send(socket, 'show:watch', { showId: id })).ok).toBe(true);
      for (const [event, payload] of actions) {
        const ack = await send(socket, event, payload);
        expect(ack.ok, `${event} by ${cookie ?? 'guest'}`).toBe(false);
      }
    }
    expect(harness.server.shows.get(id)?.state).toBe('live');
    expect(harness.server.shows.get(id)?.holder?.id).toBe(mia.me.id);
  });

  it('are acknowledged for the holder, including the hand-over to a watching organiser', async () => {
    harness = await startHarness();
    const { id, mia } = await liveShow(harness);
    const noah = await harness.signIn('Noah', 'organiser');
    const miaSocket = await harness.socket(mia.cookie);
    await send(miaSocket, 'show:watch', { showId: id });
    expect(await send(miaSocket, 'direction:select', { showId: id, caseNumber: 2 })).toEqual({
      ok: true,
    });
    for (const step of STEPS) {
      expect(await send(miaSocket, 'direction:step', { showId: id, step })).toEqual({ ok: true });
    }
    // Noah is not watching yet, so he is not a hand-over choice.
    const away = await send(miaSocket, 'direction:handOver', {
      showId: id,
      toOrganiserId: noah.me.id,
    });
    expect(away).toMatchObject({
      ok: false,
      error: expect.stringMatching(/not watching/) as unknown,
    });
    const noahSocket = await harness.socket(noah.cookie);
    await send(noahSocket, 'show:watch', { showId: id });
    expect(
      await send(miaSocket, 'direction:handOver', { showId: id, toOrganiserId: noah.me.id }),
    ).toEqual({ ok: true });
    expect((await send(miaSocket, 'direction:end', { showId: id })).ok).toBe(false);
    expect(await send(noahSocket, 'direction:end', { showId: id })).toEqual({ ok: true });
    expect(await send(noahSocket, 'direction:step', { showId: 1 })).toMatchObject({ ok: false });
    expect(harness.server.shows.get(id)?.state).toBe('ended');
  });
});

describe('projections over the socket', () => {
  it('never send a player unopened content, and never the organiser view', async () => {
    harness = await startHarness();
    const { id, mia } = await liveShow(harness);
    const ana = await harness.signIn('Ana', 'player', 3);
    const player = await harness.socket(ana.cookie);
    const seen = record(player);
    await send(player, 'show:watch', { showId: id });
    const mod = await harness.socket(mia.cookie);
    const modSeen = record(mod);
    await send(mod, 'show:watch', { showId: id });
    for (const caseNumber of [1, 2, 3]) {
      await send(mod, 'direction:select', { showId: id, caseNumber });
      for (const step of STEPS) await send(mod, 'direction:step', { showId: id, step });
    }
    // One round trip more, so every push has arrived.
    await send(player, 'show:watch', { showId: id });
    expect(seen.public.length).toBeGreaterThan(10);
    expectNoLeak(seen.public, harness.server.shows.get(id)?.sealing?.secret ?? 'missing');
    expect(
      seen.public
        .at(-1)
        ?.cases.filter((c) => c.opened)
        .map((c) => c.number),
    ).toEqual([1, 2, 3]);
    expect(seen.organiser).toEqual([]);
    expect(seen.personal.length).toBeGreaterThan(0);
    // The organiser sees the direction, and no contents either.
    const last = modSeen.organiser.at(-1);
    expect(last?.holder?.id).toBe(mia.me.id);
    expect(last?.show.cases.filter((c) => c.artifact !== null).map((c) => c.number)).toEqual([
      1, 2, 3,
    ]);
    expect(modSeen.public).toEqual([]);
  });

  it('refuses a socket handshake from another origin', async () => {
    harness = await startHarness();
    await expect(harness.socket(undefined, 'http://evil.example')).rejects.toThrow();
    const ok = await harness.socket();
    expect(await send(ok, 'show:watch', { showId: 'nope' })).toMatchObject({ ok: false });
    expect(await send(ok, 'show:watch', {})).toMatchObject({ ok: false });
  });
});
