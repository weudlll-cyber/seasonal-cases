/**
 * @file   apps/server/src/securityPass2.test.ts
 * @brief  Tests the fixes of docs/security-pass.md's second pass (the numbers are its findings'):
 *         the limits on watching and claiming, the address budget of claims and sign-ins (D37),
 *         and a socket that follows its session.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { ADDRESS_LIMIT, ADDRESS_LIMIT_TEXT } from './addressLimit.js';
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

describe('the address budget (D37)', () => {
  it('stops the 61st claim from one address across players, and sign-ins with it', async () => {
    const h = await startHarness();
    harness = h;
    const olga = await h.signIn('Olga', 'organiser');
    const made = await h.server.app.inject({
      method: 'POST',
      url: '/api/shows',
      payload: { cases: 4, winners: 1, labels: [] },
      headers: { cookie: olga.cookie },
    });
    const { id } = made.json<{ id: string }>();
    await h.server.app.inject({
      method: 'POST',
      url: `/api/shows/${id}/open`,
      headers: { cookie: olga.cookie },
    });
    const players = await Promise.all(['Ana', 'Bo', 'Cy', 'Di'].map((n) => h.signIn(n, 'player')));
    const answers = [];
    // Each player stays within their own 20 a minute; together they pass the address's 60.
    for (const player of players) {
      for (let i = 0; i < 16; i += 1) {
        answers.push(
          await h.server.app.inject({
            method: 'POST',
            url: `/api/shows/${id}/claim`,
            payload: { caseNumber: 1 + (i % 4) },
            headers: { cookie: player.cookie },
          }),
        );
      }
    }
    const codes = answers.map((a) => a.statusCode);
    expect(codes.slice(0, ADDRESS_LIMIT).every((c) => c === 200)).toBe(true);
    expect(codes.slice(ADDRESS_LIMIT)).toEqual([429, 429, 429, 429]);
    expect(answers[ADDRESS_LIMIT]?.json()).toEqual({ error: ADDRESS_LIMIT_TEXT });
    const signIn = await h.server.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in',
      payload: { login: 'nobody', password: 'whatever it is' },
    });
    expect(signIn.statusCode).toBe(429);
    expect(signIn.json()).toEqual({ error: ADDRESS_LIMIT_TEXT });
  });
});

describe('third pass, 1: a message without its ack', () => {
  it('is dropped, and the server keeps answering', async () => {
    const h = await startHarness();
    harness = h;
    const olga = await h.signIn('Olga', 'organiser');
    const made = h.server.shows.quickTest({ ...SETUP, seed: 'p3' }, olga.me);
    if (!made.ok) throw new Error(made.error);
    const id = made.model.id;
    const guest = await h.socket();
    const events = [
      'show:watch',
      'show:applaud',
      'direction:begin',
      'direction:select',
      'direction:step',
      'direction:handOver',
      'direction:end',
    ] as const;
    // Without an ack, and with the ack in the request's place: both once made the handler
    // call `undefined`.
    for (const event of events) {
      guest.emit(event, { showId: id }, undefined as never);
      (guest.emit as (e: string, ...a: unknown[]) => void)(event, () => undefined);
    }
    expect(await send(guest, 'show:watch', { showId: id })).toEqual({ ok: true });
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
