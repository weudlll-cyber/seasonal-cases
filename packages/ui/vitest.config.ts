/**
 * @file   packages/ui/vitest.config.ts
 * @brief  Vitest project config of @sc/ui: jsdom, and the kit's stylesheets readable as text.
 *
 * Responsibility: run the client pieces' tests in jsdom; let a test read the kit's CSS entries
 *                 with `?raw` (Vitest empties CSS imports by default; kit docs/DELIVERY.md).
 * Depends on:     vitest
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@sc/ui',
    environment: 'jsdom',
    // The id carries the `?raw` query, so the pattern is not anchored at the end.
    css: { include: [/\.css/] },
  },
});
