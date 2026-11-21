/**
 * @file   apps/server/src/app.test.ts
 * @brief  Tests that the built server answers its health route.
 */
import { describe, expect, it } from 'vitest';

import { buildApp } from './app.js';

describe('buildApp', () => {
  it('answers the health route', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.json()).toEqual({ ok: true });
    await app.close();
  });
});
