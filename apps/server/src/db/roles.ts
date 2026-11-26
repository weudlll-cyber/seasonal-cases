/**
 * @file   apps/server/src/db/roles.ts
 * @brief  The migration step of an installed game: migrate as the owner, then grant the app role.
 *
 * Responsibility: an installed database has two roles beside the superuser (kit K90, DECISIONS
 *                 D82; made by the kit's ops/lib/db-roles.sql): `sc_owner` migrates, `sc_app`
 *                 is what the running game connects as and only reads and writes rows.
 *                 `migrateAndGrant` runs on the owner's connection: the pending migrations, then
 *                 the kit's `grantAppRole` (the migration record read-only). Without the role
 *                 (development, tests) it migrates only.
 * Depends on:     @seasonal/kit/server, ./migrator.js, ./pool.js (types)
 */
import { grantAppRole } from '@seasonal/kit/server';

import { migrate } from './migrator.js';
import type { DbPool } from './pool.js';

export const APP_ROLE = 'sc_app';

/** Answers the migrations applied now and whether the app role was granted its rights. */
export async function migrateAndGrant(
  pool: DbPool,
  schema: string,
  role: string = APP_ROLE,
): Promise<{ readonly applied: readonly string[]; readonly granted: boolean }> {
  const applied = await migrate(pool, schema);
  const granted = await grantAppRole(pool, { schema, role, readOnly: ['schema_migrations'] });
  return { applied, granted };
}
