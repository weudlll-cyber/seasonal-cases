/**
 * @file   e2e/server.ts
 * @brief  The browser tests' own server: a clean data folder, then the real server on 3980.
 *
 * Responsibility: delete `.local/e2e/` (the previous run's event logs), then start the server
 *                 in development mode on 127.0.0.1:3980 with its logs under `.local/e2e/data`.
 *                 A running `pnpm dev` (3970, `.local/data`) is neither used nor touched. Mail goes
 *                 to Mailpit (SMTP 127.0.0.1:1170, ops/compose.dev.yml; CI's service), whose
 *                 links open the e2e client (5480); journey 5 reads it there. A standalone admin
 *                 per browser project (./rootAdmin.ts) is seeded for journey 6.
 * Depends on:     node:fs, node:url, ../apps/server/src/index.ts, ./rootAdmin.ts
 */
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  buildServer,
  configFrom,
  hashPassword,
  memoryAccounts,
  memoryCredentials,
} from '../apps/server/src/index.js';
import { ROOT_PROJECTS, rootFor } from './rootAdmin.js';

const E2E_DIR = fileURLToPath(new URL('../.local/e2e/', import.meta.url));
const SERVER_PORT = 3980;

rmSync(E2E_DIR, { recursive: true, force: true });
const config = configFrom({
  ...process.env,
  NODE_ENV: 'development',
  SC_DEV: '1',
  SC_PORT: String(SERVER_PORT),
  SC_DATA_DIR: `${E2E_DIR}data`,
  SC_SMTP_HOST: '127.0.0.1',
  SC_SMTP_PORT: '1170',
  SC_PUBLIC_ORIGIN: 'http://127.0.0.1:5480',
});
// The standalone admins of journey 6, one per browser project, as `pnpm sc admin promote` would
// make them; they live in this server's memory and end with it.
const accounts = memoryAccounts();
const credentials = memoryCredentials();
for (const project of ROOT_PROJECTS) {
  const root = rootFor(project);
  await accounts.save({
    id: root.id,
    kind: 'local',
    name: root.name,
    role: 'admin',
    rank: 0,
    steps: [],
    websiteOrigin: null,
    websiteUserId: null,
    deleted: false,
  });
  await credentials.create({
    accountId: root.id,
    // The name key as ../apps/server/src/auth/names.ts makes it for these plain names.
    nameKey: root.name.toLowerCase(),
    email: root.email,
    passwordHash: await hashPassword(root.password),
  });
}
const { app } = await buildServer(config, { accounts, credentials });
await app.listen({ host: '127.0.0.1', port: config.port });
console.log(`e2e server on http://127.0.0.1:${String(config.port)}`);
