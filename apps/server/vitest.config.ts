/**
 * @file   apps/server/vitest.config.ts
 * @brief  Vitest project config of @sc/server: a longer timeout for the socket tests.
 *
 * Responsibility: each socket test starts a real server and runs up to twenty acknowledged
 *                 round trips; beside the jsdom projects of "pnpm test" that takes longer than
 *                 Vitest's 5 s default, though not longer than 20 s (vitest.config.ts, WORKERS).
 * Depends on:     vitest
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@sc/server',
    testTimeout: 20_000,
  },
});
