/**
 * @file   apps/server/src/db/stores.test.ts
 * @brief  Tests the PostgreSQL stores against a real database: migrations, accounts, sessions,
 *         the feed cursor, and the event log with its secrets encrypted at rest.
 *
 * Every test file works in a schema of its own (./testing.ts) and drops it at the end. The
 * database is SC_TEST_DATABASE_URL (CI's service container) or the development database.
 */
import { createShowService, type ShowService } from '@sc/application';
import { seededRandom, verify } from '@sc/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Account } from '../auth/accounts.js';
import { findSession, openSession } from '../auth/sessions.js';
import { open, seal, dataKey } from './box.js';
import { migrate } from './migrator.js';
import { openDatabase, type Database } from './open.js';
import { dropSchema, freshSchema, testDatabaseUrl } from './testing.js';

const KEY = 'ab'.repeat(32);
const schema = freshSchema();
let db: Database;

const reopen = () =>
  openDatabase({
    url: testDatabaseUrl(),
    keyHex: KEY,
    schema,
    onError: (e) => {
      throw e;
    },
  });

beforeAll(async () => {
  db = await reopen();
});
afterAll(async () => {
  await db.close();
  await dropSchema(schema);
});

function service(database: Database): ShowService {
  let n = 0;
  return createShowService({
    clock: { now: () => '2026-11-21T20:00:00.000Z' },
    ids: { showId: () => `show-${String((n += 1))}` },
    random: { secure: () => seededRandom('secure'), seeded: seededRandom },
    store: database.stores.events,
  });
}

const ANA: Account = {
  id: 'acc-ana',
  kind: 'website',
  name: 'Ana',
  role: 'organiser',
  rank: 3,
  badges: ['/media/step-icons/0123456789abcdef0123456789abcdef.webp'],
  websiteOrigin: 'https://site.example',
  websiteUserId: '7',
  deleted: false,
};

describe('the migrations', () => {
  it('apply once; a second run finds nothing pending', async () => {
    expect(await migrate(db.pool, schema)).toEqual([]);
  });
});

describe('the accounts and sessions', () => {
  it('save, find by id and by website, and replace an account', async () => {
    const { accounts } = db.stores;
    await accounts.save(ANA);
    expect(await accounts.byId(ANA.id)).toEqual(ANA);
    expect(await accounts.byWebsite('https://site.example', '7')).toEqual(ANA);
    expect(await accounts.byWebsite('https://other.example', '7')).toBeUndefined();
    await accounts.save({ ...ANA, deleted: true, rank: 4 });
    expect(await accounts.byId(ANA.id)).toMatchObject({ deleted: true, rank: 4 });
    expect((await accounts.all()).map((a) => a.id)).toEqual([ANA.id]);
  });

  it('keep a session under its token hash and end it per session and per account', async () => {
    const { accounts, sessions } = db.stores;
    await accounts.save({ ...ANA, id: 'acc-s', websiteUserId: '9' });
    const now = Date.parse('2026-11-21T20:00:00Z');
    const first = await openSession(sessions, 'acc-s', now);
    const second = await openSession(sessions, 'acc-s', now);
    expect(await findSession(sessions, first.token, now)).toEqual(first.session);
    await sessions.remove(first.session.id);
    expect(await findSession(sessions, first.token, now)).toBeNull();
    expect(await sessions.removeForAccount('acc-s')).toEqual([second.session.id]);
    // The row holds the hash only: the token itself is nowhere in the table.
    const rows = await db.pool.query('SELECT * FROM sessions');
    expect(JSON.stringify(rows.rows)).not.toContain(second.token);
  });

  it('keep the feed cursor', async () => {
    expect(await db.stores.cursor.read()).toBe('0');
    await db.stores.cursor.write('42');
    expect(await db.stores.cursor.read()).toBe('42');
  });
});

describe('the event log', () => {
  it('rebuilds a sealed show after a restart, its secret never in the clear', async () => {
    const outcome = service(db).quickTest(
      { cases: 6, winners: 2, labels: [], seed: 'pg' },
      {
        id: 'acc-ana',
        name: 'Ana',
      },
    );
    if (!outcome.ok) throw new Error(outcome.error);
    const sealing = outcome.model.sealing;
    if (sealing === null) throw new Error('the quick test did not seal');
    await db.stores.events.flush();
    const raw = JSON.stringify((await db.pool.query('SELECT event FROM show_events')).rows);
    expect(raw).toContain(sealing.commitment);
    expect(raw).not.toContain(sealing.secret);

    await db.close();
    db = await reopen();
    const again = db.stores.events.loadAll().get(outcome.model.id) ?? [];
    expect(again.length).toBeGreaterThan(0);
    const rebuilt = again.find((e) => e.type === 'sealed');
    expect(rebuilt).toMatchObject({ secret: sealing.secret, commitment: sealing.commitment });
    if (rebuilt?.type !== 'sealed') throw new Error('no sealed event');
    expect(verify(rebuilt.assignment, rebuilt.secret, rebuilt.commitment)).toBe(true);
  });
});

describe('the box', () => {
  it('opens with its key and in its place only, and refuses a changed box', () => {
    const key = dataKey(KEY);
    const box = seal(key, 'the secret', 'show:a');
    expect(open(key, box, 'show:a')).toBe('the secret');
    // Bound to its place: the same box does not open as another row's.
    expect(() => open(key, box, 'show:b')).toThrow();
    expect(() => open(dataKey('cd'.repeat(32)), box, 'show:a')).toThrow();
    const changed = `${box.slice(0, -2)}${box.endsWith('AA') ? 'BB' : 'AA'}`;
    expect(() => open(key, changed, 'show:a')).toThrow();
    expect(() => dataKey('short')).toThrow();
  });
});

describe('the credentials', () => {
  it('refuse a taken name or e-mail, and take a reset token once and only in time', async () => {
    const { accounts, credentials } = db.stores;
    await accounts.save({
      ...ANA,
      id: 'acc-c',
      kind: 'local',
      websiteOrigin: null,
      websiteUserId: null,
    });
    await accounts.save({
      ...ANA,
      id: 'acc-d',
      kind: 'local',
      websiteOrigin: null,
      websiteUserId: null,
    });
    const ana = {
      accountId: 'acc-c',
      nameKey: 'ana',
      email: 'ana@example.org',
      passwordHash: 'h1',
    };
    expect(await credentials.create(ana)).toBe(true);
    expect(await credentials.create({ ...ana, accountId: 'acc-d', email: 'd@example.org' })).toBe(
      false,
    );
    expect(await credentials.create({ ...ana, accountId: 'acc-d', nameKey: 'dora' })).toBe(false);
    await credentials.setPassword('acc-c', 'h2');
    expect(await credentials.byEmail('ana@example.org')).toEqual({ ...ana, passwordHash: 'h2' });
    const now = Date.parse('2026-11-21T20:00:00Z');
    await credentials.addReset('r1', 'acc-c', now + 1000);
    await credentials.addReset('r2', 'acc-c', now - 1);
    expect(await credentials.takeReset('r2', now)).toBeUndefined();
    expect(await credentials.takeReset('r1', now)).toBe('acc-c');
    expect(await credentials.takeReset('r1', now)).toBeUndefined();
  });
});

describe('the two-factor store', () => {
  it('keeps the secret encrypted, moves steps forward only, and uses a recovery code once', async () => {
    const { accounts, twoFactor } = db.stores;
    await accounts.save({
      ...ANA,
      id: 'acc-t',
      kind: 'local',
      websiteOrigin: null,
      websiteUserId: null,
    });
    const secret = new Uint8Array(20).fill(7);
    await twoFactor.setUp('acc-t', secret);
    expect(await twoFactor.get('acc-t')).toEqual({ secret, lastStep: null, enabled: false });
    const raw = JSON.stringify((await db.pool.query('SELECT * FROM two_factor')).rows);
    expect(raw).not.toContain(Buffer.from(secret).toString('base64'));
    const hash = Buffer.alloc(32, 1);
    await twoFactor.enable('acc-t', 100, [hash, Buffer.alloc(32, 2)]);
    expect(await twoFactor.get('acc-t')).toMatchObject({ lastStep: 100, enabled: true });
    expect(await twoFactor.useStep('acc-t', 100)).toBe(false);
    expect(await twoFactor.useStep('acc-t', 101)).toBe(true);
    expect(await twoFactor.useRecovery('acc-t', hash)).toBe(true);
    expect(await twoFactor.useRecovery('acc-t', hash)).toBe(false);
    expect(await twoFactor.useRecovery('acc-t', Buffer.alloc(32, 3))).toBe(false);
  });
});
