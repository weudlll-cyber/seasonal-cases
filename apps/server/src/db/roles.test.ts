/**
 * @file   apps/server/src/db/roles.test.ts
 * @brief  Tests the two database roles: the game starts and works as the app role, which cannot
 *         change the schema or the migration record.
 *
 * A schema and a login role of the test's own, both removed at the end. The database is the one of
 * ./testing.ts, whose user may create roles.
 */
import { randomBytes } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { openDatabase, type Database } from './open.js';
import { createPool } from './pool.js';
import { migrateAndGrant } from './roles.js';
import { dropSchema, freshSchema, testDatabaseUrl } from './testing.js';

const schema = freshSchema();
const role = `${schema}_app`;
const password = randomBytes(24).toString('hex');
const owner = createPool(testDatabaseUrl(), schema);
let app: Database;

const asApp = (): string => {
  const url = new URL(testDatabaseUrl());
  url.username = role;
  url.password = password;
  return url.href;
};

// Opening a fresh schema takes seconds (./stores.test.ts).
beforeAll(async () => {
  await owner.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}'`);
  expect((await migrateAndGrant(owner, schema, role)).granted).toBe(true);
  app = await openDatabase({
    url: asApp(),
    keyHex: 'ab'.repeat(32),
    schema,
    onError: (e) => {
      throw e;
    },
  });
}, 30_000);
afterAll(async () => {
  await app.close();
  await dropSchema(schema);
  await owner.query(`DROP ROLE IF EXISTS ${role}`);
  await owner.end();
});

describe('the app role', () => {
  it('reads and writes rows', async () => {
    await app.stores.accounts.save({
      id: 'acc-role',
      kind: 'dev',
      name: 'Role',
      role: 'player',
      rank: 0,
      steps: [],
      websiteOrigin: null,
      websiteUserId: null,
      deleted: false,
    });
    expect((await app.stores.accounts.byId('acc-role'))?.name).toBe('Role');
  });

  it('can neither change the schema nor the migration record', async () => {
    await expect(app.pool.query('CREATE TABLE extra (i int)')).rejects.toThrow(/permission denied/);
    await expect(app.pool.query('DROP TABLE accounts')).rejects.toThrow(/must be owner/);
    await expect(app.pool.query('DELETE FROM schema_migrations')).rejects.toThrow(
      /permission denied/,
    );
  });

  it('is not granted where it does not exist', async () => {
    expect(await migrateAndGrant(owner, schema, `${schema}_none`)).toEqual({
      applied: [],
      granted: false,
    });
  });
});
