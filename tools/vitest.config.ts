/**
 * @file   tools/vitest.config.ts
 * @brief  Vitest project config of the root tools (`pnpm kit:check`'s parsing).
 *
 * Responsibility: run tools/*.test.ts in Node as the project `tools` of the root config.
 * Depends on:     vitest
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'tools',
    environment: 'node',
  },
});
