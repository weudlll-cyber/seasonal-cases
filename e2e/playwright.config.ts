/**
 * @file   e2e/playwright.config.ts
 * @brief  Playwright: the journeys on their own stacks, and the screenshot run.
 *
 * Responsibility: start the tests' own server (127.0.0.1:3980, data under .local/e2e, cleaned at
 *                 start) and client (5480), and for journey 4 the game in website mode (3990)
 *                 behind the stand-in website (5485, ./websiteStub.ts); run the journeys one after
 *                 the other (they share the start page's "current show") in Chromium (`chromium`, CI and merge), Firefox and a
 *                 phone WebKit (`firefox`, `webkit-mobile`, nightly in browsers.yml). The project
 *                 `screens` takes the pictures of CONCEPT §7's check sizes into
 *                 .local/screens/proto-v1/ and runs only when named.
 * Depends on:     @playwright/test, ./server.ts, ./websiteServer.ts, ./websiteStub.ts, apps/web
 */
import { defineConfig, devices } from '@playwright/test';

const CLIENT = 'http://127.0.0.1:5480';

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: { baseURL: CLIENT, trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'node --import=tsx e2e/server.ts',
      cwd: '..',
      url: 'http://127.0.0.1:3980/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @sc/web dev',
      cwd: '..',
      url: CLIENT,
      env: { SC_WEB_PORT: '5480', SC_SERVER: 'http://127.0.0.1:3980' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'node --import=tsx e2e/websiteServer.ts',
      cwd: '..',
      url: 'http://127.0.0.1:3990/games/cases/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'node --import=tsx e2e/websiteStub.ts',
      cwd: '..',
      url: 'http://127.0.0.1:5485/games',
      env: { SC_MODE: 'website' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testMatch: /journey.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'firefox',
      testMatch: /journey.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'webkit-mobile',
      testMatch: /journey.*\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'screens',
      testMatch: /screens\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
