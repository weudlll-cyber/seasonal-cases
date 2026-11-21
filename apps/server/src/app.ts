/**
 * @file   apps/server/src/app.ts
 * @brief  Builds the Fastify app: the health route.
 *
 * Responsibility: assemble the server's routes; ./main.ts binds it to 127.0.0.1:3970.
 * Depends on:     fastify
 */
import Fastify, { type FastifyInstance } from 'fastify';

/** The server without a listening socket, so tests can inject requests. */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.get('/api/health', () => ({ ok: true }));
  return app;
}
