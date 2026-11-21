/**
 * @file   apps/server/src/tools/sc.ts
 * @brief  The server's command line: `pnpm sc admin promote <name>` makes the first admin.
 *
 * Responsibility: on the server's own database (DATABASE_URL, SC_DATA_KEY), give the standalone
 *                 account with that name the admin role and end its sessions, so the next
 *                 sign-in carries the role. Further roles are set by an admin in the admin area.
 *                 Website accounts take their role from the website and are refused, as in
 *                 seasonal-mini-games' `smg admin create-super`.
 * Depends on:     ../auth/credentials.js, ../config.js, ../db/open.js
 */
import { nameKey } from '../auth/credentials.js';
import { configFrom } from '../config.js';
import { openDatabase } from '../db/open.js';

const USAGE = 'usage: pnpm sc admin promote <name>';

async function promote(name: string): Promise<string> {
  const { database } = configFrom(process.env);
  if (database === null) return 'the command needs DATABASE_URL and SC_DATA_KEY';
  const db = await openDatabase({
    ...database,
    onError: (e) => {
      console.error(e);
    },
  });
  try {
    const { credentials, accounts, sessions } = db.stores;
    const found = await credentials.byName(nameKey(name));
    const account = found === undefined ? undefined : await accounts.byId(found.accountId);
    if (account === undefined || account.deleted) return `there is no account named ${name}`;
    await accounts.save({ ...account, role: 'admin' });
    await sessions.removeForAccount(account.id);
    return `${account.name} is an admin now; they sign in again`;
  } finally {
    await db.close();
  }
}

const [group, command, name] = process.argv.slice(2);
if (group !== 'admin' || command !== 'promote' || name === undefined) {
  console.error(USAGE);
  process.exit(1);
}
console.log(await promote(name));
