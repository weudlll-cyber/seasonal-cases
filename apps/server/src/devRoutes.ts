/**
 * @file   apps/server/src/devRoutes.ts
 * @brief  The development routes: sign-in by name and role, and the dev admin API.
 *
 * Responsibility: the prototype's only sign-in (CONCEPT §10) and the organiser's actions of
 *                 the development admin (CONCEPT §9): create, open and close registration,
 *                 fill with bots, seal, start, Quick Test. Registered only while the server
 *                 runs with NODE_ENV=development and SC_DEV=1 (./app.ts); otherwise every one
 *                 of these paths answers 404.
 * Depends on:     node:crypto, fastify, @sc/application (types), @sc/contracts, ./http.js,
 *                 ./session.js
 */
import { randomUUID } from 'node:crypto';

import type { ShowService } from '@sc/application';
import {
  CreateShowRequestSchema,
  QuickTestRequestSchema,
  SignInRequestSchema,
  type Me,
} from '@sc/contracts';
import type { FastifyInstance } from 'fastify';

import { accepted, moderator, parseBody, summary } from './http.js';
import { clearSession, setSession } from './session.js';

interface IdParams {
  readonly id: string;
}

export function devRoutes(app: FastifyInstance, shows: ShowService): void {
  app.post('/api/dev/sign-in', (request, reply) => {
    const { name, role, rank } = parseBody(SignInRequestSchema, request.body);
    // A fresh id per sign-in: a second tab with the same name is a second person.
    const me: Me = { id: randomUUID(), name, role, rank };
    setSession(reply, me);
    return me;
  });

  app.post('/api/dev/sign-out', (_request, reply) => {
    clearSession(reply);
    return { ok: true };
  });

  app.post('/api/dev/shows', (request) => {
    const me = moderator(app, request);
    const setup = parseBody(CreateShowRequestSchema, request.body);
    return summary(accepted(shows.createShow(me, setup)));
  });

  app.post('/api/dev/quick-test', (request) => {
    const me = moderator(app, request);
    const { seed, ...setup } = parseBody(QuickTestRequestSchema, request.body);
    return summary(accepted(shows.quickTest({ ...setup, seed }, me)));
  });

  // The organiser's steps of one show; each answers with the show's summary.
  const steps: Record<string, (id: string, me: Me) => ReturnType<ShowService['seal']>> = {
    open: (id, me) => shows.openRegistration(id, me.id),
    close: (id, me) => shows.closeRegistration(id, me.id),
    bots: (id) => shows.fillWithBots(id),
    seal: (id, me) => shows.seal(id, me.id),
    start: (id, me) => shows.start(id, me),
  };
  for (const [path, step] of Object.entries(steps)) {
    app.post<{ Params: IdParams }>(`/api/dev/shows/:id/${path}`, (request) => {
      const me = moderator(app, request);
      return summary(accepted(step(request.params.id, me)));
    });
  }
}
