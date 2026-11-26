/**
 * @file   apps/server/src/compose.test.ts
 * @brief  The production stack's containers carry the kit's hardening (K89, ops/compose.yml).
 *
 * Reads the file as Docker Compose resolves it (`docker compose config`, with stand-in values for
 * what an installer would write; nothing is started) and asks the kit's `findWeakContainers`.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { findWeakContainers } from '@seasonal/kit/testing';
import { describe, expect, it } from 'vitest';

const OPS = fileURLToPath(new URL('../../../ops/', import.meta.url));
const SETTINGS = {
  SC_IMAGE: 'seasonal-cases:test',
  SC_ENV_FILE: `${OPS}cases.env.example`,
  SC_HOST_PORT: '3970',
  POSTGRES_PASSWORD: 'stand-in',
  SC_DB_OWNER_PASSWORD: 'stand-in',
  SC_DB_APP_PASSWORD: 'stand-in',
  SC_WEBSITE_NETWORK: 'seasonal-site_default',
};

const resolved = (...files: string[]): unknown =>
  JSON.parse(
    execFileSync(
      'docker',
      ['compose', ...files.flatMap((f) => ['-f', `${OPS}${f}`]), 'config', '--format', 'json'],
      { encoding: 'utf8', env: { ...process.env, ...SETTINGS } },
    ),
  );

describe('the compose stack', () => {
  // Docker starts a process of its own for this; seconds on a loaded machine.
  it('has no weak container, in either mode', { timeout: 60_000 }, () => {
    const services = { app: 'app', migrate: 'app', postgres: 'database' } as const;
    for (const files of [
      ['compose.yml', 'compose.journal.yml'],
      ['compose.yml', 'compose.website.yml', 'compose.journal.yml'],
    ]) {
      expect(findWeakContainers(resolved(...files), { services })).toEqual([]);
    }
  });
});
