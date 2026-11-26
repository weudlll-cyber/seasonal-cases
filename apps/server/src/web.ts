/**
 * @file   apps/server/src/web.ts
 * @brief  The server's web layer: its log, its security headers, and the built client.
 *
 * Responsibility:
 *   - `loggerOptions`: one JSON line per event on stdout (Fastify's pino), at SC_LOG_LEVEL; a
 *     request is logged by method and path only, never its query (a reset link's token), headers
 *     or cookies (SC-N3 piece 2).
 *   - `headersOf`: the kit's security headers (`securityHeaderSet`, D69): its strict policy with
 *     `frame-src` for the website's chat (GAME-INTEGRATION §5: 'self', and in local development
 *     the chat's origin), the website as the other frame ancestor in website mode,
 *     `upgrade-insecure-requests` where the game is served over https, no HSTS.
 *   - `serveClient`: the built client (`pnpm build`) under the base path; assets cached for a
 *     year (their names carry a hash), the page itself never; any other GET under the base path
 *     that is not the API answers the page, so the client's routes load from a link. The
 *     development pages under `dev/` (the opening's showcase, `/dev/opening`) answer 404 unless
 *     the server runs in development (`SC_DEV`).
 * Depends on:     node:fs, node:path, fastify (types), @fastify/static, @seasonal/kit/server,
 *                 ./config.js
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

import fastifyStatic from '@fastify/static';
import { securityHeaderSet, type SecurityHeaderSet } from '@seasonal/kit/server';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';

import { servedOverHttps, type ServerConfig } from './config.js';

export function loggerOptions(
  config: ServerConfig,
): Exclude<FastifyServerOptions['logger'], undefined> {
  return {
    level: config.logLevel,
    serializers: {
      req: (request: { method: string; url: string }) => ({
        method: request.method,
        path: request.url.split('?')[0],
      }),
    },
  };
}

export function headersOf(config: ServerConfig): SecurityHeaderSet {
  const frames = ["'self'", ...(config.chatOrigin === null ? [] : [config.chatOrigin])];
  const secure = servedOverHttps(config);
  if (config.website === null) return securityHeaderSet({ mode: 'standalone', frames, secure });
  const websiteOrigin = config.website.origin;
  return securityHeaderSet({ mode: 'website', websiteOrigin, frames, secure });
}

// The server's own paths under the base path: never answered with the page.
const OWN = ['api/', 'socket.io/', 'auth/'];
// The development pages: the page only in development, 404 everywhere else.
const DEV_PAGES = 'dev/';

export async function serveClient(app: FastifyInstance, config: ServerConfig): Promise<void> {
  const dir = config.clientDir;
  if (dir === null) return;
  if (!existsSync(path.join(dir, 'index.html'))) {
    throw new Error(`the built client is missing in ${dir}: run pnpm build`);
  }
  await app.register(fastifyStatic, {
    root: dir,
    prefix: config.basePath,
    wildcard: true,
    setHeaders: (res, file) => {
      const asset = file.includes(`${path.sep}assets${path.sep}`);
      void res.header('cache-control', asset ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  });
  const notPages = config.dev ? OWN : [...OWN, DEV_PAGES];
  app.setNotFoundHandler((request, reply) => {
    const inner = request.url.startsWith(config.basePath)
      ? request.url.slice(config.basePath.length)
      : null;
    if (request.method !== 'GET' || inner === null || notPages.some((p) => inner.startsWith(p))) {
      return reply.code(404).send({ error: 'not found' });
    }
    return reply.header('cache-control', 'no-cache').sendFile('index.html');
  });
}
