/**
 * @file   apps/server/src/applause.test.ts
 * @brief  Tests the applause (D39): 5 a second per socket, only from a watcher of a live show,
 *         sent at once and then at most every 500 ms, the last 10 s counted apart from the
 *         total; and once through a real socket.
 */
import type { Applause } from '@sc/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applauseCounter, APPLAUSE_EVERY_MS, APPLAUSE_RECENT_MS } from './applause.js';
import { send, startHarness, type Harness } from './testing/harness.js';

describe('the applause counter', () => {
  let sent: Applause[];
  const counter = (live = true, watching = true) =>
    applauseCounter({
      isLive: () => live,
      watches: () => watching,
      broadcast: (a) => {
        sent.push(a);
      },
      now: () => Date.now(),
    });

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('takes 5 a second per socket', () => {
    const c = counter();
    const acks = Array.from({ length: 6 }, () => c.applaud('s1', { showId: 'show-1' }));
    expect(acks.slice(0, 5).every((a) => a.ok)).toBe(true);
    expect(acks[5]).toEqual({ ok: false, error: 'not so fast' });
    expect(c.applaud('s2', { showId: 'show-1' })).toEqual({ ok: true });
    vi.advanceTimersByTime(1000);
    expect(c.applaud('s1', { showId: 'show-1' })).toEqual({ ok: true });
    c.stop();
  });

  it('sends the first at once, then at most every 500 ms with the total', () => {
    const c = counter();
    c.applaud('s1', { showId: 'show-1' });
    expect(sent).toEqual([{ showId: 'show-1', total: 1, recent: 1 }]);
    for (const s of ['s2', 's3', 's4']) c.applaud(s, { showId: 'show-1' });
    expect(sent).toHaveLength(1);
    vi.advanceTimersByTime(APPLAUSE_EVERY_MS - 1);
    expect(sent).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ showId: 'show-1', total: 4, recent: 4 });
    // After 10 s the old applause no longer counts as recent; the total stays.
    vi.advanceTimersByTime(APPLAUSE_RECENT_MS);
    c.applaud('s1', { showId: 'show-1' });
    expect(sent.at(-1)).toEqual({ showId: 'show-1', total: 5, recent: 1 });
    c.stop();
  });

  it('takes nothing from a show that is not live or not watched', () => {
    expect(counter(false).applaud('s1', { showId: 'show-1' })).toEqual({
      ok: false,
      error: 'the show is not live',
    });
    expect(counter(true, false).applaud('s1', { showId: 'show-1' })).toEqual({
      ok: false,
      error: 'watch the show first',
    });
    expect(counter().applaud('s1', {})).toEqual({ ok: false, error: 'which show?' });
    expect(sent).toEqual([]);
  });
});

describe('applause through a socket', () => {
  let harness: Harness | undefined;
  afterEach(async () => {
    await harness?.close();
    harness = undefined;
  });

  it('reaches every watcher of the live show, guests included, and changes nothing else', async () => {
    const h = await startHarness();
    harness = h;
    const mia = await h.signIn('Mia', 'organiser');
    const made = h.server.shows.quickTest({ cases: 4, winners: 1, labels: [], seed: 'ap' }, mia.me);
    if (!made.ok) throw new Error(made.error);
    const id = made.model.id;
    const before = h.server.shows.get(id);
    const guest = await h.socket();
    const other = await h.socket();
    const heard = new Promise<Applause>((resolve) => {
      other.once('show:applause', resolve);
    });
    expect(await send(guest, 'show:applaud', { showId: id })).toEqual({
      ok: false,
      error: 'watch the show first',
    });
    await send(guest, 'show:watch', { showId: id });
    await send(other, 'show:watch', { showId: id });
    expect(await send(guest, 'show:applaud', { showId: id })).toEqual({ ok: true });
    expect(await heard).toEqual({ showId: id, total: 1, recent: 1 });
    // Applause is no event of the show: its model is the same object as before.
    expect(h.server.shows.get(id)).toBe(before);
  });
});
