/**
 * @file   apps/server/src/production.test.ts
 * @brief  Tests the production run: the settings' check, health and readiness, and the built
 *         client under both base paths (SC-N3 piece 2).
 *
 * The client test writes a small stand-in build (index.html, theme-init.js, one asset) into a
 * temporary folder and removes it afterwards; the real `pnpm build` was booted by hand and in
 * the play-through (docs/NIGHT-RUN.md).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { memoryStore } from '@sc/application';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from './app.js';
import { configFrom } from './config.js';
import { ConfigError } from './configRead.js';

const KEY = 'ab'.repeat(32);
// One key given twice: as the data key and as the recovery key.
const SHARED = '12'.repeat(31) + '34';
const PRODUCTION = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://u:p@127.0.0.1:5432/db',
  SC_DATA_KEY: KEY,
  SC_RECOVERY_KEY: 'cd'.repeat(31) + 'ef',
  SC_COOKIE_SECRET: 'x'.repeat(32),
  SC_PUBLIC_ORIGIN: 'https://cases.example',
};
const WEBSITE = {
  SC_MODE: 'website',
  SC_PROXY_SECRET: 'proxy-secret',
  SC_WEBSITE_ORIGIN: 'https://site.example',
  SC_TRUSTED_PROXIES: '127.0.0.1',
};

function problemsOf(env: NodeJS.ProcessEnv): readonly string[] {
  try {
    configFrom(env);
    return [];
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
}

describe('the settings check', () => {
  it('names every missing value of production in one message', () => {
    const problems = problemsOf({ NODE_ENV: 'production' });
    const names = ['DATABASE_URL', 'SC_DATA_KEY', 'SC_RECOVERY_KEY', 'SC_COOKIE_SECRET'];
    for (const name of [...names, 'SC_PUBLIC_ORIGIN']) {
      expect(problems.some((p) => p.startsWith(`${name} is required in production`))).toBe(true);
    }
    expect(problemsOf(PRODUCTION)).toEqual([]);
  });

  it('names malformed values', () => {
    const problems = problemsOf({
      ...PRODUCTION,
      SC_PORT: 'eighty',
      DATABASE_URL: 'mysql://x',
      SC_DATA_KEY: 'short',
      SC_RECOVERY_KEY: 'short',
      SC_COOKIE_SECRET: 'too short',
      SC_PUBLIC_ORIGIN: 'not an address',
      SC_MODE: 'cloud',
      SC_HOST: 'localhost',
    });
    expect(problems).toHaveLength(8);
  });

  it('refuses a recovery key of one repeated byte, which the kit would refuse at the first code', () => {
    expect(problemsOf({ ...PRODUCTION, SC_RECOVERY_KEY: 'cd'.repeat(32) })).toEqual([
      'SC_RECOVERY_KEY must not repeat one byte',
    ]);
  });

  it('refuses a recovery key that is the data key (kit K20)', () => {
    expect(
      problemsOf({ ...PRODUCTION, SC_DATA_KEY: SHARED, SC_RECOVERY_KEY: SHARED.toUpperCase() }),
    ).toEqual(['SC_RECOVERY_KEY must not be SC_DATA_KEY']);
  });

  it('asks a development run with a database for its recovery key, and none without one', () => {
    const database = { DATABASE_URL: PRODUCTION.DATABASE_URL, SC_DATA_KEY: KEY };
    expect(problemsOf(database)).toEqual([
      'SC_RECOVERY_KEY is required in a run with DATABASE_URL',
    ]);
    expect(configFrom({}).recoveryKey).toHaveLength(32);
  });

  it('asks website mode for its trust settings and the feed for both values', () => {
    const missing = problemsOf({ SC_MODE: 'website' });
    expect(missing.filter((p) => p.endsWith('required in website mode'))).toHaveLength(3);
    const half = problemsOf({ ...WEBSITE, SC_GAMES_SYNC_TOKEN: 'token' });
    expect(half).toEqual([expect.stringMatching(/go together/)]);
    expect(problemsOf(WEBSITE)).toEqual([]);
  });

  it('allows the test-only plain cookie under NODE_ENV=test and nowhere else', () => {
    const plain = { ...WEBSITE, SC_TEST_PLAIN_COOKIE: '1' };
    const refused = /SC_TEST_PLAIN_COOKIE is for the browser tests only/;
    expect(problemsOf({ ...PRODUCTION, ...plain })).toEqual([expect.stringMatching(refused)]);
    expect(problemsOf({ ...plain, NODE_ENV: 'development' })).toEqual([
      expect.stringMatching(refused),
    ]);
    expect(problemsOf(plain)).toEqual([expect.stringMatching(refused)]);
    expect(configFrom({ ...plain, NODE_ENV: 'test' }).plainCookie).toBe(true);
    expect(configFrom({ ...WEBSITE, NODE_ENV: 'test' }).plainCookie).toBe(false);
  });
});

describe('health and readiness', () => {
  it('say whether the database answers, without secrets', async () => {
    let up = true;
    const config = configFrom({ SC_COOKIE_SECRET: 'x'.repeat(32) });
    const server = await buildServer(config, {
      events: memoryStore(),
      probe: () => Promise.resolve(up),
    });
    const get = (url: string) => server.app.inject({ method: 'GET', url });
    expect((await get('/api/health')).json()).toEqual({
      ok: true,
      mode: 'local',
      version: config.version,
      db: 'ok',
    });
    expect((await get('/api/ready')).statusCode).toBe(200);
    up = false;
    expect((await get('/api/health')).json()).toMatchObject({ ok: false, db: 'down' });
    expect((await get('/api/ready')).statusCode).toBe(503);
    await server.app.close();
  });
});

describe('the built client', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'sc-client-'));
    mkdirSync(path.join(dir, 'assets'));
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Seasonal Cases</title>');
    writeFileSync(path.join(dir, 'assets', 'index-abc.js'), 'export {};');
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  for (const [mode, env, base] of [
    ['local', {}, '/'],
    ['website', WEBSITE, '/games/cases/'],
  ] as const) {
    it(`is served under ${base} in ${mode} mode, the API beside it`, async () => {
      const config = configFrom({ ...env, SC_CLIENT_DIR: dir, SC_COOKIE_SECRET: 'x'.repeat(32) });
      const server = await buildServer(config, { events: memoryStore() });
      const address = await server.app.listen({ host: '127.0.0.1', port: 0 });
      const page = await fetch(`${address}${base}`);
      expect(await page.text()).toContain('Seasonal Cases');
      expect(page.headers.get('cache-control')).toBe('no-cache');
      expect(page.headers.get('referrer-policy')).toBe('strict-origin');
      const asset = await fetch(`${address}${base}assets/index-abc.js`);
      expect(asset.headers.get('cache-control')).toContain('immutable');
      // A client route answers the page; the API's unknown paths do not.
      expect(await (await fetch(`${address}${base}chronicle`)).text()).toContain('Seasonal Cases');
      expect((await fetch(`${address}${base}api/nothing`)).status).toBe(404);
      expect((await fetch(`${address}${base}api/health`)).status).toBe(200);
      await server.app.close();
    });
  }
});
