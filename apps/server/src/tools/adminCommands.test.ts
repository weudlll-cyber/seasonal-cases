/**
 * @file   apps/server/src/tools/adminCommands.test.ts
 * @brief  Tests `pnpm sc admin promote` (with the name rule) and `reset-2fa` on memory stores.
 */
import { describe, expect, it } from 'vitest';

import { memoryAccounts, type Account } from '../auth/accounts.js';
import { memoryCredentials } from '../auth/credentials.js';
import { openSession, memorySessions } from '../auth/sessions.js';
import { memoryTwoFactor } from '../auth/twoFactor.js';
import { promote, resetTwoFactor } from './adminCommands.js';

const OLGA: Account = {
  id: 'acc-olga',
  kind: 'local',
  name: 'Olga',
  role: 'player',
  rank: 0,
  badges: [],
  websiteOrigin: null,
  websiteUserId: null,
  deleted: false,
};

async function stores() {
  const s = {
    accounts: memoryAccounts(),
    credentials: memoryCredentials(),
    sessions: memorySessions(),
    twoFactor: memoryTwoFactor(),
  };
  await s.accounts.save(OLGA);
  await s.credentials.create({
    accountId: OLGA.id,
    nameKey: 'olga',
    email: 'o@example.org',
    passwordHash: 'h',
  });
  return s;
}

describe('the admin commands', () => {
  it('promote by a look-alike name and end the sessions', async () => {
    const s = await stores();
    await openSession(s.sessions, OLGA.id, 0);
    expect(await promote(s, 'ÓLGA')).toMatch(/admin now/);
    expect((await s.accounts.byId(OLGA.id))?.role).toBe('admin');
    expect(await s.sessions.removeForAccount(OLGA.id)).toEqual([]);
    expect(await promote(s, 'nobody')).toMatch(/no account/);
  });

  it('promote refuses a name from before the name rule until it is renamed (D36)', async () => {
    const s = await stores();
    await s.accounts.save({ ...OLGA, name: 'Ol ga' });
    expect(await promote(s, 'olga')).toMatch(/does not meet the name rule/);
    expect((await s.accounts.byId(OLGA.id))?.role).toBe('player');
  });

  it('reset-2fa removes the second factor, its codes and the sessions', async () => {
    const s = await stores();
    await s.twoFactor.setUp(OLGA.id, new Uint8Array(20));
    await s.twoFactor.enable(OLGA.id, 1, [Buffer.alloc(32, 1)]);
    await openSession(s.sessions, OLGA.id, 0);
    expect(await resetTwoFactor(s, 'olga')).toMatch(/no second factor/);
    expect(await s.twoFactor.get(OLGA.id)).toBeUndefined();
    expect(await s.twoFactor.useRecovery(OLGA.id, Buffer.alloc(32, 1))).toBe(false);
    expect(await s.sessions.removeForAccount(OLGA.id)).toEqual([]);
  });
});
