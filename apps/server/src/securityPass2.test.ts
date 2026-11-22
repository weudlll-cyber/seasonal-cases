/**
 * @file   apps/server/src/securityPass2.test.ts
 * @brief  Tests the fixes of docs/security-pass.md's second pass (the numbers are its findings'):
 *         the limits on watching and claiming, and a socket that follows its session.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { send, startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

const SETUP = { cases: 4, winners: 1, labels: [] };

describe('3: watching and claiming are limited', () => {
  it('sends a guest its own view only, and refuses an eleventh watch in ten seconds', async () => {
    const h = await startHarness();
    harness = h;
    const made = h.server.shows.createShow({ id: 'o', name: 'Olga' }, SETUP);
    if (!made.ok) throw new Error(made.error);
    const id = made.model.id;
    const other = await h.socket();
    let received = 0;
    other.on('show:public', () => {
      received += 1;
    });
    await send(other, 'show:watch', { showId: id });
    const guest = await h.socket();
    const acks = [];
    for (let i = 0; i < 11; i += 1) acks.push(await send(guest, 'show:watch', { showId: id }));
    expect(acks.slice(0, 10).every((a) => a.ok)).toBe(true);
    expect(acks[10]).toEqual({ ok: false, error: 'too many requests, wait a moment' });
    // The other watcher got its own join's view only, nothing of the guest's ten.
    expect(received).toBe(1);
  });

  it('refuses a twenty-first claim in a minute', async () => {
    const h = await startHarness();
    harness = h;
    const olga = await h.signIn('Olga', 'organiser');
    const ana = await h.signIn('Ana', 'player');
    const inject = (url: string, cookie: string, payload: object) =>
      h.server.app.inject({ method: 'POST', url, payload, headers: { cookie } });
    const { id } = (await inject('/api/shows', olga.cookie, SETUP)).json<{ id: string }>();
    await inject(`/api/shows/${id}/open`, olga.cookie, {});
    const codes: number[] = [];
    for (let i = 0; i < 21; i += 1) {
      codes.push(
        (await inject(`/api/shows/${id}/claim`, ana.cookie, { caseNumber: 1 + (i % 4) }))
          .statusCode,
      );
    }
    expect(codes.slice(0, 20).every((c) => c === 200)).toBe(true);
    expect(codes[20]).toBe(429);
  });
});

describe('5: a socket follows its session', () => {
  it('refuses direction and closes once the session is gone elsewhere', async () => {
    const h = await startHarness();
    harness = h;
    const olga = await h.signIn('Olga', 'organiser');
    const made = h.server.shows.quickTest({ ...SETUP, seed: 'p2' }, olga.me);
    if (!made.ok) throw new Error(made.error);
    const socket = await h.socket(olga.cookie);
    await send(socket, 'show:watch', { showId: made.model.id });
    expect(await send(socket, 'direction:begin', { showId: made.model.id })).toEqual({ ok: true });
    // As `pnpm sc admin reset-2fa` does from another process: the store only, no live signal.
    await h.server.auth.sessions.removeForAccount(olga.me.id);
    const closed = new Promise<void>((resolve) => {
      socket.once('disconnect', () => {
        resolve();
      });
    });
    const answer = await send(socket, 'direction:select', { showId: made.model.id, caseNumber: 1 });
    expect(answer).toEqual({ ok: false, error: 'only an organiser can direct' });
    await closed;
  });
});
