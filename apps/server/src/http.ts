/**
 * @file   apps/server/src/http.ts
 * @brief  The HTTP helpers every route shares: body parsing, refusals, outcomes, guards.
 *
 * Responsibility: one way to answer a bad body (400), a missing sign-in (401), a missing
 *                 right (403), an unknown show (404) and a refused command (409), each with
 *                 `{ error }`; the context every route gets; the summary a show is listed with.
 * Depends on:     fastify, zod, @sc/application (types), @sc/contracts, @sc/domain (types),
 *                 ./config.js (types), ./session.js
 */
import type { Outcome, ShowService } from '@sc/application';
import { canDirect, type Me, type ShowSummary } from '@sc/contracts';
import type { ShowModel } from '@sc/domain';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';

import type { ServerConfig } from './config.js';
import { sessionOf, type Auth } from './session.js';

export class Refusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The body parsed by the schema, or a 400 refusal naming the first problem. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Refusal(400, `${issue?.path.join('.') ?? 'body'}: ${issue?.message ?? 'invalid'}`);
  }
  return parsed.data;
}

/** What every route needs: the app (cookies), the sign-in, the shows and the settings. */
export interface Ctx {
  readonly app: FastifyInstance;
  readonly auth: Auth;
  readonly shows: ShowService;
  readonly config: ServerConfig;
}

/** The signed-in user, or a 401 refusal. */
export async function signedIn(ctx: Ctx, request: FastifyRequest): Promise<Me> {
  const current = await sessionOf(ctx.app, ctx.auth, request);
  if (current === null) throw new Refusal(401, 'sign in first');
  return current.me;
}

/** The signed-in organiser or admin, or a 401/403 refusal. */
export async function organiser(ctx: Ctx, request: FastifyRequest): Promise<Me> {
  const me = await signedIn(ctx, request);
  if (!canDirect(me.role)) throw new Refusal(403, 'only an organiser or admin can do this');
  return me;
}

/** The model of an accepted outcome, or the refusal it stands for. */
export function accepted(outcome: Outcome): ShowModel {
  if (outcome.ok) return outcome.model;
  throw new Refusal(outcome.notFound ? 404 : 409, outcome.error);
}

export function summary(model: ShowModel): ShowSummary {
  return {
    id: model.id,
    state: model.state,
    caseCount: model.caseCount,
    winnerCount: model.prizes.length,
    createdAt: model.createdAt,
  };
}

/** Answers every Refusal with its status and `{ error }`; anything else stays a 500. */
export function handleRefusals(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply: FastifyReply) => {
    if (error instanceof Refusal) return reply.code(error.status).send({ error: error.message });
    app.log.error(error);
    return reply.code(500).send({ error: 'something went wrong on the server' });
  });
}
