/**
 * @file   apps/server/src/start.ts
 * @brief  `pnpm start`: the production run, one Node process for the API, the sockets and the
 *         built client.
 *
 * Responsibility: default NODE_ENV to `production` (an explicit value, say from systemd's
 *                 environment file, wins), then start ./main.ts. Production requires the database,
 *                 the data key and a cookie secret (./config.ts, docs/CONFIG.md).
 * Depends on:     ./main.js
 */
process.env['NODE_ENV'] ??= 'production';
await import('./main.js');
