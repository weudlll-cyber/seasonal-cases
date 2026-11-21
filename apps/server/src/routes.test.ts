/**
 * @file   apps/server/src/routes.test.ts
 * @brief  Tests the HTTP side: the development routes exist only in development mode, the
 *         session, and the roles each route asks for.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { configFrom } from './config.js';
import { currentShow } from './showRoutes.js';
import { startHarness, type Harness } from './testing/harness.js';

let harness: Harness | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

describe('development mode', () => {
  it('is on only with NODE_ENV=development and SC_DEV=1', () => {
    expect(configFrom({ NODE_ENV: 'development', SC_DEV: '1' }).dev).toBe(true);
    expect(configFrom({ NODE_ENV: 'production', SC_DEV: '1' }).dev).toBe(false);
    expect(configFrom({ NODE_ENV: 'development' }).dev).toBe(false);
    expect(configFrom({ NODE_ENV: 'development', SC_DEV: 'true' }).dev).toBe(false);
  });

  it('answers 404 on every development route outside development mode', async () => {
    harness = await startHarness(false);
    const { app } = harness.server;
    for (const url of ['/api/dev/sign-in', '/api/dev/quick-test', '/api/dev/shows']) {
      const response = await app.inject({ method: 'POST', url, payload: {} });
      expect(response.statusCode).toBe(404);
    }
    expect((await app.inject({ method: 'GET', url: '/api/health' })).json()).toEqual({ ok: true });
  });
});

describe('the current show', () => {
  it('is the newest live show, then sealed, registration, setup, and only then ended', async () => {
    harness = await startHarness();
    const { shows } = harness.server;
    const ada = { id: 'ada', name: 'Ada' };
    const id = (o: ReturnType<typeof shows.createShow>) => (o.ok ? o.model.id : 'refused');
    const setup = { cases: 4, winners: 1, labels: [] };
    const older = id(shows.createShow(ada, setup));
    const live = id(shows.quickTest({ ...setup, seed: 'a' }, ada));
    const newer = id(shows.createShow(ada, setup));
    expect(currentShow(shows)?.id).toBe(live);
    shows.endShow(live, ada.id);
    expect(currentShow(shows)?.id).toBe(newer);
    shows.openRegistration(older, ada.id);
    expect(currentShow(shows)?.id).toBe(older);
    shows.closeRegistration(older, ada.id);
    shows.seal(older, ada.id);
    expect(currentShow(shows)?.id).toBe(older);
    const answer = await harness.server.app.inject({ method: 'GET', url: '/api/shows/current' });
    expect(answer.json<{ show: { id: string } }>().show.id).toBe(older);
  });
});

describe('the session and the roles', () => {
  it('signs in by name, role and rank, and knows the user afterwards', async () => {
    harness = await startHarness();
    const { app } = harness.server;
    expect((await app.inject({ method: 'GET', url: '/api/me' })).json()).toEqual({ me: null });
    const { me, cookie } = await harness.signIn('Ana', 'player', 4);
    expect(me).toMatchObject({ name: 'Ana', role: 'player', rank: 4 });
    const answer = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(answer.json()).toEqual({ me });
    // A forged cookie value without the signature is nobody.
    const forged = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: 'sc_session=eyJ9' },
    });
    expect(forged.json()).toEqual({ me: null });
    const bad = await app.inject({
      method: 'POST',
      url: '/api/dev/sign-in',
      payload: { name: '' },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('lets only moderators and admins use the dev admin, and only players claim', async () => {
    harness = await startHarness();
    const { app } = harness.server;
    const setup = { cases: 4, winners: 1, labels: [] };
    const anonymous = await app.inject({ method: 'POST', url: '/api/dev/shows', payload: setup });
    expect(anonymous.statusCode).toBe(401);
    const player = await harness.signIn('Ana', 'player', 2);
    const asPlayer = await app.inject({
      method: 'POST',
      url: '/api/dev/shows',
      payload: setup,
      headers: { cookie: player.cookie },
    });
    expect(asPlayer.statusCode).toBe(403);
    const admin = await harness.signIn('Ada', 'admin');
    const post = (url: string, cookie: string, payload: unknown = {}) =>
      app.inject({ method: 'POST', url, payload: payload as object, headers: { cookie } });
    const created = await post('/api/dev/shows', admin.cookie, setup);
    const { id } = created.json<{ id: string }>();
    expect((await post(`/api/dev/shows/${id}/open`, admin.cookie)).statusCode).toBe(200);
    expect((await post(`/api/shows/${id}/claim`, admin.cookie, { caseNumber: 1 })).statusCode).toBe(
      403,
    );
    expect(
      (await post(`/api/shows/${id}/claim`, player.cookie, { caseNumber: 9 })).statusCode,
    ).toBe(409);
    expect(
      (await post(`/api/shows/${id}/claim`, player.cookie, { caseNumber: 2 })).statusCode,
    ).toBe(200);
    expect((await post('/api/dev/shows/nope/open', admin.cookie)).statusCode).toBe(404);
    for (const step of ['bots', 'close', 'seal', 'start']) {
      expect((await post(`/api/dev/shows/${id}/${step}`, admin.cookie)).statusCode).toBe(200);
    }
    const view = (await app.inject({ method: 'GET', url: `/api/shows/${id}` })).json<{
      state: string;
      cases: { ownerName: string | null; artifact: unknown }[];
    }>();
    expect(view.state).toBe('live');
    expect(view.cases[1]?.ownerName).toBe('Ana');
    expect(view.cases.every((c) => c.artifact === null)).toBe(true);
    const current = (await app.inject({ method: 'GET', url: '/api/shows/current' })).json<{
      show: { id: string };
    }>();
    expect(current.show.id).toBe(id);
    expect((await app.inject({ method: 'GET', url: '/api/shows/nope' })).statusCode).toBe(404);
  });
});
