/**
 * @file   apps/server/src/healthRoutes.ts
 * @brief  `GET /api/health` and `GET /api/ready`: for the installer, a monitor and the proxy.
 *
 * Responsibility: health answers `{ ok, mode, version, db }` and never a secret: `db` is `ok` or
 *                 `down` by a short query against the database, `none` in a run without one
 *                 (development and tests). Ready answers 503 until the database answers; the
 *                 migrations run before the server listens (./main.ts), so a listening server
 *                 has them. Both work in every mode, without a sign-in.
 * Depends on:     ./http.js (types)
 */
import type { Ctx } from './http.js';

export type Probe = () => Promise<boolean>;

export function healthRoutes(ctx: Ctx, probe: Probe | null): void {
  const { app, config } = ctx;
  const dbState = async () => (probe === null ? 'none' : (await probe()) ? 'ok' : 'down');

  app.get('/api/health', async () => {
    const db = await dbState();
    return { ok: db !== 'down', mode: config.mode, version: config.version, db };
  });

  app.get('/api/ready', async (_request, reply) => {
    const db = await dbState();
    return db === 'down' ? reply.code(503).send({ ready: false }) : { ready: true };
  });
}
