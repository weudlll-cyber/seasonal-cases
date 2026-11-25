/**
 * @file   apps/server/src/healthRoutes.ts
 * @brief  `GET /healthz` and `GET /readyz` under the base path: for the installer, a monitor and
 *         the proxy (the kit's names and readiness answer, D69).
 *
 * Responsibility: liveness answers `{ status: 'ok', version }` and asks nothing. Readiness runs the
 *                 database probe against the kit's time limit (`readiness`): 200
 *                 `{ status: 'ready', version }`, or 503 `{ status: 'unavailable', reason:
 *                 'database' }`, the error logged and never in the body; a run without a database
 *                 (development and tests) is ready at once. The migrations run before the server
 *                 listens (./main.ts), so a listening server has them. Both work in every mode,
 *                 without a sign-in. Readiness asks the database, so it is limited to 60 a minute
 *                 per address (the kit's note on the public route).
 * Depends on:     @seasonal/kit/server, ./addressKey.js, ./http.js (types)
 */
import { HEALTH_PATHS, RateLimiter, readiness } from '@seasonal/kit/server';

import { addressKey } from './addressKey.js';
import type { Ctx } from './http.js';

export type Probe = () => Promise<boolean>;

export function healthRoutes(ctx: Ctx, probe: Probe | null): void {
  const { app, config } = ctx;
  // The kit counts a probe that fails or is late as unavailable; the game's probe answers false.
  const database = async (): Promise<void> => {
    if (probe !== null && !(await probe())) throw new Error('the database does not answer');
  };

  app.get(HEALTH_PATHS.live, () => ({ status: 'ok', version: config.version }));

  const perAddress = new RateLimiter({ limit: 60, windowMs: 60_000 });
  app.get(HEALTH_PATHS.ready, async (request, reply) => {
    if (!perAddress.take(addressKey(request.ip)).allowed) {
      return reply.code(429).send({ status: 'unavailable', reason: 'too many requests' });
    }
    const answer = await readiness(database, {
      extra: () => Promise.resolve({ version: config.version }),
    });
    if (answer.error !== undefined) request.log.warn(answer.error);
    return reply.code(answer.code).send(answer.body);
  });
}
