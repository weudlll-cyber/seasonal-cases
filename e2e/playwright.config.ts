/**
 * @file   e2e/playwright.config.ts
 * @brief  Playwright: the journeys on their own stacks, and the screenshot run.
 *
 * Responsibility: start the tests' own server (127.0.0.1:3980, data under .local/e2e, cleaned at
 *                 start) and client (5480), and for journey 4 the game in website mode (3990)
 *                 behind the stand-in website (5485, ./websiteStub.ts); run the journeys one after
 *                 the other (they share the start page's "current show") in Chromium (`chromium`,
 *                 CI and merge), and at desktop and phone sizes in all three browsers
 *                 (`chromium-mobile`, `firefox`, `firefox-mobile`, `webkit`, `webkit-mobile`,
 *                 nightly in browsers.yml). The project
 *                 `screens` takes the pictures of CONCEPT §7's check sizes into
 *                 .local/screens/proto-v5/ and the opening's frames into
 *                 .local/screens/opening-frames/, and runs only when named.
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
      // The accessibility check (axe) runs here only: it is the required job's.
      testMatch: /(journey.*|access)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'firefox',
      testMatch: /journey.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'chromium-mobile',
      testMatch: /journey.*\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      // Firefox has no phone emulation: a phone's window, so the layout is the phone's.
      name: 'firefox-mobile',
      testMatch: /journey.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'webkit',
      testMatch: /journey.*\.spec\.ts/,
      // As webkit-mobile below: software drawing makes every click slower.
      timeout: 240_000,
      use: { ...devices['Desktop Safari'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'webkit-mobile',
      testMatch: /journey.*\.spec\.ts/,
      // Playwright's WebKit draws in software: each click waits 0.5–7 s for still frames, so a
      // journey through four cases needs more than the 90 s Chromium does (measured 2026-11-22).
      timeout: 240_000,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'screens',
      testMatch: /(screens|openingFrames|headerSteps)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
