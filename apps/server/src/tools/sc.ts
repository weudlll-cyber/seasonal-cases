/**
 * @file   apps/server/src/tools/sc.ts
 * @brief  The server's command line: `pnpm sc admin promote <name>` makes an admin,
 *         `pnpm sc admin reset-2fa <name>` removes an account's second factor
 *         (`pnpm dev:sc …` on the development database, with dev.env).
 *
 * Responsibility: open the server's own database (DATABASE_URL, SC_DATA_KEY from the shell,
 *                 never a file's development key, security pass 14), run one command of
 *                 ./adminCommands.ts and print its answer. Further roles are set by an admin in
 *                 the admin area. As seasonal-mini-games' `smg admin …`.
 * Depends on:     ../config.js, ../db/open.js, ./adminCommands.js
 */
import { configFrom } from '../config.js';
import { openDatabase } from '../db/open.js';
import { promote, resetTwoFactor, type AdminStores } from './adminCommands.js';

const USAGE = 'usage: pnpm sc admin promote <name> | pnpm sc admin reset-2fa <name>';
const COMMANDS: Record<string, (stores: AdminStores, name: string) => Promise<string>> = {
  promote,
  'reset-2fa': resetTwoFactor,
};

async function run(command: (stores: AdminStores, name: string) => Promise<string>, name: string) {
  const { database } = configFrom(process.env);
  if (database === null) {
    return 'the command needs DATABASE_URL and SC_DATA_KEY (on the development database: pnpm dev:sc)';
  }
  const db = await openDatabase({
    ...database,
    onError: (e) => {
      console.error(e);
    },
  });
  try {
    return await command(db.stores, name);
  } finally {
    await db.close();
  }
}

const [group, name, target] = process.argv.slice(2);
const command = name === undefined ? undefined : COMMANDS[name];
if (group !== 'admin' || command === undefined || target === undefined) {
  console.error(USAGE);
  process.exit(1);
}
console.log(await run(command, target));
