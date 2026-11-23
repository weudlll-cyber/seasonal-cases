/**
 * @file   vitest.config.ts
 * @brief  Root Vitest config: every workspace package and app is one test project.
 *
 * Responsibility: let "pnpm test" run every project on half the cores but at most four, and
 *                 the root tools' tests as the project `tools` (tools/vitest.config.ts);
 *                 "pnpm test:coverage" measures the domain and the application against
 *                 CLAUDE.md's target (game logic 85 % branches). A project with its own config
 *                 (apps/web, apps/server, packages/ui) sets its environment and timeout.
 */
import { availableParallelism } from 'node:os';

import { defineConfig } from 'vitest/config';

// Half the logical cores, at most four, as Mini Games (its DECISIONS T206): with one worker per
// file on all cores, the jsdom projects and the socket tests starved each other (a socket test
// of 20 round trips passed alone in 2 s and timed out at 5 s inside the full run).
const WORKERS = Math.min(4, Math.max(1, Math.floor(availableParallelism() / 2)));

export default defineConfig({
  test: {
    // Each folder becomes a project named after its package.json "name" (e.g. @sc/domain).
    projects: ['packages/*', 'apps/*', 'tools'],
    maxWorkers: WORKERS,
    // Off for "pnpm test"; "pnpm test:coverage" turns it on.
    coverage: {
      provider: 'v8',
      include: ['packages/domain/src/**', 'packages/application/src/**'],
      exclude: ['**/*.test.ts', '**/testing/**'],
      reporter: ['text-summary', 'text'],
      thresholds: {
        'packages/domain/src/**': { lines: 90, branches: 85 },
        'packages/application/src/**': { lines: 80, branches: 75 },
      },
    },
  },
});
