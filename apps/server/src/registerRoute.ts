/**
 * @file   apps/server/src/registerRoute.ts
 * @brief  `POST /api/auth/register`: a new standalone account, with one answer for every e-mail.
 *
 * Responsibility: DECISIONS D36. The name must meet the rule (./auth/names.ts) and must be free:
 *                 names are public on every board, so a taken name answers 409. The e-mail never
 *                 shows in the answer: a new one makes a player of rank 0 and gets a mail that
 *                 the account is ready; a taken one makes nothing and gets a mail that an account
 *                 exists, with the way to sign in or reset the password. Both hash the password
 *                 and answer `{ ok: true }` no sooner than `REGISTER_MIN_MS` after the request,
 *                 so neither the answer nor its time tells them apart. Nobody is signed in: the
 *                 new account signs in with its password. Registrations are limited to 5 an hour
 *                 per address (counted once the form passes the rules). Without a mailer the
 *                 answer is the same and nothing is sent.
 * Depends on:     node:crypto, @seasonal/kit/server, @sc/contracts, ./auth/*, ./http.js,
 *                 ./localRoutes.js (types), ./addressKey.js
 */
import { randomUUID } from 'node:crypto';

import { RateLimiter } from '@seasonal/kit/server';
import {
  NAME_TEXT,
  PASSWORD_TEXT,
  RegisterRequestSchema,
  type RegisterRequest,
} from '@sc/contracts';

import { addressKey } from './addressKey.js';
import type { Account } from './auth/accounts.js';
import { emailKey } from './auth/credentials.js';
import { nameAllowed, nameKey } from './auth/names.js';
import { hashPassword, passwordProblem } from './auth/passwords.js';
import { parseBody, Refusal, type Ctx } from './http.js';
import type { LocalAccounts } from './localRoutes.js';

// Both answers take at least this long: the slower path's work plus room (D36).
export const REGISTER_MIN_MS = 1000;
const HOUR = 60 * 60_000;

const readyText = (origin: string): string =>
  [
    'Your Seasonal Cases account is ready.',
    '',
    `Sign in here with your name or this e-mail and your password:\n${origin}/`,
  ].join('\n');

const existsText = (origin: string): string =>
  [
    'Someone tried to register a new Seasonal Cases account with this e-mail.',
    'There already is an account for it.',
    '',
    `Sign in here, or choose "Forgotten password" if you need a new one:\n${origin}/`,
    '',
    'If it was not you, ignore this mail; nothing has changed.',
  ].join('\n');

function checked(body: RegisterRequest): void {
  if (!nameAllowed(body.name)) throw new Refusal(400, NAME_TEXT);
  const problem = passwordProblem(body.password);
  if (problem !== null) throw new Refusal(400, PASSWORD_TEXT[problem]);
}

/** A new player of rank 0, or false when the e-mail (or, in a race, the name) is taken. */
async function created(ctx: Ctx, local: LocalAccounts, body: RegisterRequest): Promise<boolean> {
  const passwordHash = await hashPassword(body.password);
  const email = emailKey(body.email);
  if ((await local.credentials.byEmail(email)) !== undefined) return false;
  const account: Account = {
    id: randomUUID(),
    kind: 'local',
    name: body.name,
    role: 'player',
    rank: 0,
    badges: [],
    websiteOrigin: null,
    websiteUserId: null,
    deleted: false,
  };
  await ctx.auth.accounts.save(account);
  const made = await local.credentials.create({
    accountId: account.id,
    nameKey: nameKey(body.name),
    email,
    passwordHash,
  });
  // Another registration took the name or e-mail in between: this account never signs in.
  if (!made) await ctx.auth.accounts.save({ ...account, deleted: true });
  return made;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });

export function registerRoute(ctx: Ctx, local: LocalAccounts): void {
  const registrations = new RateLimiter({ limit: 5, windowMs: HOUR });
  ctx.app.post('/api/auth/register', async (request) => {
    const started = Date.now();
    const body = parseBody(RegisterRequestSchema, request.body);
    checked(body);
    // Counted after the rules: a refused form costs the server nothing (no hash, no row).
    if (!registrations.take(addressKey(request.ip)).allowed) {
      throw new Refusal(429, 'too many tries, wait a few minutes');
    }
    if ((await local.credentials.byName(nameKey(body.name))) !== undefined) {
      throw new Refusal(409, 'This name is already taken.');
    }
    const isNew = await created(ctx, local, body);
    const text = (isNew ? readyText : existsText)(local.publicOrigin);
    const subject = isNew ? 'Your Seasonal Cases account' : 'Your Seasonal Cases account exists';
    // The answer does not wait for the mail: sending takes as long as it takes.
    if (local.mailer !== null) {
      void local.mailer.send({ to: body.email, subject, text }).catch(local.log);
    }
    await wait(REGISTER_MIN_MS - (Date.now() - started));
    return { ok: true };
  });
}
