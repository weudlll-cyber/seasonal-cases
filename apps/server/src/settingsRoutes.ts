/**
 * @file   apps/server/src/settingsRoutes.ts
 * @brief  The settings in the admin area: read by organisers, changed by admins.
 *
 * Responsibility: `GET /api/settings` answers the current values to an organiser or admin (the
 *                 setup form starts from the defaults). `POST /api/admin/settings` replaces them
 *                 after the catalogue's check (@sc/contracts `SettingsSchema`), for an admin only,
 *                 with two-factor sign-in where it is required (./accountRoutes.ts `admin`).
 *                 New shows take the new values; shows that exist keep theirs (DECISIONS D25).
 * Depends on:     @sc/contracts, ./accountRoutes.js, ./http.js, ./settings.js (types)
 */
import { SettingsSchema, type Settings } from '@sc/contracts';

import { admin } from './accountRoutes.js';
import { organiser, parseBody, type Ctx } from './http.js';
import type { CurrentSettings } from './settings.js';

export function settingsRoutes(ctx: Ctx, settings: CurrentSettings): void {
  const { app } = ctx;

  app.get('/api/settings', async (request): Promise<Settings> => {
    await organiser(ctx, request);
    return settings.now();
  });

  app.post('/api/admin/settings', async (request): Promise<Settings> => {
    await admin(ctx, request);
    const next = parseBody(SettingsSchema, request.body);
    await settings.replace(next);
    return next;
  });
}
