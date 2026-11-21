/**
 * @file   vitest.config.ts
 * @brief  Root Vitest config: every workspace package and app is one test project.
 *
 * Responsibility: let "pnpm test" run every project; "pnpm test:coverage" measures the domain
 *                 and the application against CLAUDE.md's target (game logic 85 % branches).
 *                 A project with its own config (apps/web, packages/ui) sets its environment.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each folder becomes a project named after its package.json "name" (e.g. @sc/domain).
    projects: ['packages/*', 'apps/*'],
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
