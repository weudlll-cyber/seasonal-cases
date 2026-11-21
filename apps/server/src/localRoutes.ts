/**
 * @file   apps/server/src/localRoutes.ts
 * @brief  Standalone accounts in local mode: register, sign in, forgotten password, reset.
 *
 * Responsibility: DECISIONS D24 on the rules of seasonal-mini-games (./auth/passwords.ts).
 *                 - Register: a name, an e-mail and a password; a new account is a player of rank
 *                   0. A taken name or e-mail answers one sentence for both.
 *                 - Sign-in by name or e-mail; a wrong name and a wrong password answer the same
 *                   and take as long (the dummy hash). An admin with two-factor sign-in gets
 *                   `{ twoFactor: true }` until a TOTP or recovery code comes with the password. The kit's RateLimiter: 20 per 15 minutes
 *                   per address, 5 per login and address, 5 registrations an hour per address
 *                   (counted once the form passes the rules).
 *                 - Forgotten password: always the same answer; a known e-mail gets a link with a
 *                   random token, stored as its sha256, valid 1 hour, used once. The reset ends
 *                   every session and every other link of the account.
 *                 Registered only in local mode (./app.ts); website mode answers 404 here.
 * Depends on:     node:crypto, fastify (types), @seasonal/kit/server, @sc/contracts,
 *                 ./auth/*, ./http.js, ./mail.js (types), ./session.js
 */
import { randomBytes, randomUUID } from 'node:crypto';

import { RateLimiter } from '@seasonal/kit/server';
import {
  ForgotRequestSchema,
  LocalSignInRequestSchema,
  PASSWORD_TEXT,
  RegisterRequestSchema,
  ResetRequestSchema,
  type RegisterRequest,
} from '@sc/contracts';
import type { FastifyRequest } from 'fastify';

import type { Account } from './auth/accounts.js';
import { emailKey, type CredentialStore } from './auth/credentials.js';
import { nameKey } from './auth/names.js';
import { dummyHash, hashPassword, passwordMatches, passwordProblem } from './auth/passwords.js';
import { tokenHash } from './auth/sessions.js';
import { codeAccepted, needsTwoFactor } from './auth/twoFactor.js';
import { parseBody, Refusal, type Ctx } from './http.js';
import type { Mailer } from './mail.js';
import { signIn } from './session.js';

const MINUTE = 60_000;
export const RESET_MS = 60 * MINUTE;
const SIGN_IN_FAILED = 'Wrong name, e-mail or password.';

export interface LocalAccounts {
  readonly credentials: CredentialStore;
  readonly mailer: Mailer | null;
  readonly publicOrigin: string;
  readonly log: (error: unknown) => void;
}

function newPassword(password: string): void {
  const problem = passwordProblem(password);
  if (problem !== null) throw new Refusal(400, PASSWORD_TEXT[problem]);
}

function limited(limiter: RateLimiter, key: string): void {
  if (!limiter.take(key).allowed) throw new Refusal(429, 'too many tries, wait a few minutes');
}

const resetText = (link: string): string =>
  [
    'Someone asked to reset the password of your Seasonal Cases account.',
    '',
    `Choose a new password here (the link works once, for one hour):\n${link}`,
    '',
    'If it was not you, ignore this mail; your password stays as it is.',
  ].join('\n');

const TAKEN = 'This name or e-mail is already taken.';

/** A new local player of rank 0 with its sign-in data, or a 409 when the name or e-mail is taken. */
async function registerAccount(ctx: Ctx, credentials: CredentialStore, body: RegisterRequest) {
  const key = nameKey(body.name);
  const email = emailKey(body.email);
  if ((await credentials.byName(key)) ?? (await credentials.byEmail(email))) {
    throw new Refusal(409, TAKEN);
  }
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
  const passwordHash = await hashPassword(body.password);
  if (!(await credentials.create({ accountId: account.id, nameKey: key, email, passwordHash }))) {
    // Another registration took the name or e-mail in between: this account never signs in.
    await ctx.auth.accounts.save({ ...account, deleted: true });
    throw new Refusal(409, TAKEN);
  }
  return account;
}

/**
 * True when the account has two-factor sign-in and no code came yet; a wrong code is a 401.
 * Codes are limited to 10 per 15 minutes per account (Mini Games' twoFactor rule).
 */
async function secondFactorMissing(
  ctx: Ctx,
  account: Account,
  code: string | undefined,
  perAccount: RateLimiter,
): Promise<boolean> {
  if (!needsTwoFactor(account)) return false;
  const found = await ctx.auth.twoFactor.get(account.id);
  if (found?.enabled !== true) return false;
  if (code === undefined) return true;
  limited(perAccount, account.id);
  if (!(await codeAccepted(ctx.auth.twoFactor, account.id, code, ctx.auth.now()))) {
    throw new Refusal(401, 'Wrong code.');
  }
  return false;
}

// Register and sign in.
function entryRoutes(ctx: Ctx, credentials: CredentialStore): void {
  const { app, auth } = ctx;
  const perAddress = new RateLimiter({ limit: 20, windowMs: 15 * MINUTE });
  const perLogin = new RateLimiter({ limit: 5, windowMs: 15 * MINUTE });
  const registrations = new RateLimiter({ limit: 5, windowMs: 60 * MINUTE });
  const perAccount = new RateLimiter({ limit: 10, windowMs: 15 * MINUTE });

  app.post('/api/auth/register', async (request, reply) => {
    const body = parseBody(RegisterRequestSchema, request.body);
    newPassword(body.password);
    // Counted after the rules: a refused form costs the server nothing (no hash, no row).
    limited(registrations, request.ip);
    return signIn(ctx, request, reply, await registerAccount(ctx, credentials, body));
  });

  app.post('/api/auth/sign-in', async (request, reply) => {
    limited(perAddress, request.ip);
    const { login, password, code } = parseBody(LocalSignInRequestSchema, request.body);
    limited(perLogin, `${login.toLowerCase()}|${request.ip}`);
    const found = login.includes('@')
      ? await credentials.byEmail(emailKey(login))
      : await credentials.byName(nameKey(login));
    const matches = await passwordMatches(found?.passwordHash ?? (await dummyHash()), password);
    const account = found === undefined ? undefined : await auth.accounts.byId(found.accountId);
    if (!matches || account === undefined || account.deleted) {
      throw new Refusal(401, SIGN_IN_FAILED);
    }
    if (await secondFactorMissing(ctx, account, code, perAccount)) return { twoFactor: true };
    return signIn(ctx, request, reply, account);
  });
}

// The forgotten password and the reset through its link.
function passwordRoutes(ctx: Ctx, local: LocalAccounts): void {
  const { app, auth } = ctx;
  const forgotten = new RateLimiter({ limit: 5, windowMs: 60 * MINUTE });
  const resets = new RateLimiter({ limit: 10, windowMs: 15 * MINUTE });

  app.post('/api/auth/forgot', (request) => {
    limited(forgotten, request.ip);
    const { mailer } = local;
    if (mailer === null) throw new Refusal(503, 'mail is not set up on this server');
    const { email } = parseBody(ForgotRequestSchema, request.body);
    // The answer does not wait for the lookup or the mail: it is the same for every e-mail.
    void sendReset(local, mailer, emailKey(email), auth.now()).catch(local.log);
    return { ok: true };
  });

  app.post('/api/auth/reset', async (request: FastifyRequest) => {
    limited(resets, request.ip);
    const { token, password } = parseBody(ResetRequestSchema, request.body);
    newPassword(password);
    const accountId = await local.credentials.takeReset(tokenHash(token), auth.now());
    if (accountId === undefined) throw new Refusal(400, 'This link is no longer valid.');
    await local.credentials.setPassword(accountId, await hashPassword(password));
    await local.credentials.endResets(accountId);
    const ended = await auth.sessions.removeForAccount(accountId);
    if (ended.length > 0) void auth.ends.end(ended);
    return { ok: true };
  });
}

export function localRoutes(ctx: Ctx, local: LocalAccounts): void {
  entryRoutes(ctx, local.credentials);
  passwordRoutes(ctx, local);
}

async function sendReset(local: LocalAccounts, mailer: Mailer, email: string, now: number) {
  const found = await local.credentials.byEmail(email);
  if (found === undefined) return;
  const token = randomBytes(32).toString('base64url');
  await local.credentials.addReset(tokenHash(token), found.accountId, now + RESET_MS);
  const link = `${local.publicOrigin}/reset?token=${token}`;
  await mailer.send({ to: email, subject: 'Your Seasonal Cases password', text: resetText(link) });
}
