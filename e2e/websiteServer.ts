/**
 * @file   e2e/websiteServer.ts
 * @brief  The browser tests' game server in website mode, behind the stand-in website.
 *
 * Responsibility: delete `.local/e2e/website/`, then start the real server in website mode on
 *                 127.0.0.1:3990 with the stand-in's proxy secret, the stand-in as the website
 *                 (http://127.0.0.1:5485) and 127.0.0.1 as the only trusted proxy, the session
 *                 cookie without Secure (the test-only mode: the stand-in is plain http). A
 *                 running `pnpm dev` is neither used nor touched.
 * Depends on:     node:fs, node:url, ../apps/server/src/index.ts, ./stubShared.ts
 */
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { buildServer, configFrom } from '../apps/server/src/index.js';
import { STUB_ORIGIN, STUB_PROXY_SECRET } from './stubShared.js';

const DATA = fileURLToPath(new URL('../.local/e2e/website/', import.meta.url));

rmSync(DATA, { recursive: true, force: true });
const config = configFrom({
  ...process.env,
  SC_MODE: 'website',
  SC_PORT: '3990',
  SC_DATA_DIR: DATA,
  SC_PROXY_SECRET: STUB_PROXY_SECRET,
  SC_WEBSITE_ORIGIN: STUB_ORIGIN,
  SC_TRUSTED_PROXIES: '127.0.0.1',
  // The stand-in website is plain http, where WebKit drops a Secure cookie: the test-only
  // cookie mode, which the config allows under NODE_ENV=test alone.
  NODE_ENV: 'test',
  SC_TEST_PLAIN_COOKIE: '1',
});
const { app } = await buildServer(config);
await app.listen({ host: '127.0.0.1', port: config.port });
console.log(`e2e website-mode server on http://127.0.0.1:${String(config.port)}`);
