/**
 * @file   apps/server/src/localRoutes.ts
 * @brief  Standalone accounts in local mode: register, sign in, forgotten password, reset.
 *
 * Responsibility: DECISIONS D24 on the rules of seasonal-mini-games (./auth/passwords.ts).
 *                 - Register (./registerRoute.ts): one answer for every e-mail, the rest by mail
 *                   (D36); the account exists once the mail's link is used (D42).
 *                 - Sign-in by name or e-mail; a wrong name and a wrong password answer the same
 *                   and take as long (the dummy hash). An admin with two-factor sign-in gets
 *                   `{ twoFactor: true }` until a TOTP or recovery code comes with the password.
 *                   Limits, in this order: the brake against guessing (./auth/failureBrake.ts,
 *                   DECISIONS D51, D55), failures only, per 15 minutes: 20 at one address for
 *                   one account, 100 for an account everywhere, 20 at an address for every
 *                   account; then the sign-ins' cap per address, 20 a minute (./addressLimit.ts,
 *                   D45). A try the brake refuses never counts on the
 *                   cap; every try the brake lets through reaches the password check.
 *                 - Forgotten password: always the same answer; a known e-mail gets a link with a
 *                   random token, stored as its sha256, valid 1 hour, used once (3 mails an hour
 *                   per address at most). The reset ends every session and every other link of
 *                   the account.
 *                 Registered only in local mode (./app.ts); website mode answers 404 here.
 * Depends on:     node:crypto, fastify (types), @seasonal/kit/server, @sc/contracts,
 *                 ./addressKey.js, ./addressLimit.js (types), ./auth/*, ./http.js,
 *                 ./mail.js (types), ./registerRoute.js, ./session.js
 */
import { randomBytes } from 'node:crypto';

import { RateLimiter, type Attempt } from '@seasonal/kit/server';
import {
  ForgotRequestSchema,
  LocalSignInRequestSchema,
  PASSWORD_TEXT,
  ResetRequestSchema,
} from '@sc/contracts';
import type { FastifyRequest } from 'fastify';

import { addressKey } from './addressKey.js';
import type { AddressLimit } from './addressLimit.js';
import type { Account } from './auth/accounts.js';
import { emailKey, type CredentialStore } from './auth/credentials.js';
import { SignInBrake } from './auth/failureBrake.js';
import { nameKey } from './auth/names.js';
import { dummyHash, hashPassword, passwordMatches, passwordProblem } from './auth/passwords.js';
import type { PendingStore } from './auth/pending.js';
import { tokenHash } from './auth/sessions.js';
import { codeAccepted, needsTwoFactor } from './auth/twoFactor.js';
import { parseBody, Refusal, type Ctx } from './http.js';
import type { Mailer } from './mail.js';
import { registerRoute } from './registerRoute.js';
import { signIn } from './session.js';

const MINUTE = 60_000;
export const RESET_MS = 60 * MINUTE;
const SIGN_IN_FAILED = 'Wrong name, e-mail or password.';

export interface LocalAccounts {
  readonly credentials: CredentialStore;
  // Registrations waiting for their link (./auth/pending.ts, D42).
  readonly pending: PendingStore;
  // The sign-ins' cap per address, 20 a minute (./addressLimit.ts, D45), behind the brake.
  readonly perAddress: AddressLimit;
  readonly mailer: Mailer | null;
  readonly publicOrigin: string;
  readonly log: (error: unknown) => void;
}

function newPassword(password: string): void {
  const problem = passwordProblem(password);
  if (problem !== null) throw new Refusal(400, PASSWORD_TEXT[problem]);
}

const TOO_MANY_TRIES = 'too many tries, wait a few minutes';

function limited(limiter: RateLimiter, key: string): void {
  if (!limiter.take(key).allowed) throw new Refusal(429, TOO_MANY_TRIES);
}

const resetText = (link: string): string =>
  [
    'Someone asked to reset the password of your Seasonal Cases account.',
    '',
    `Choose a new password here (the link works once, for one hour):\n${link}`,
    '',
    'If it was not you, ignore this mail; your password stays as it is.',
  ].join('\n');

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
  if (
    !(await codeAccepted(
      { store: ctx.auth.twoFactor, recoveryKey: ctx.auth.recoveryKey },
      account.id,
      code,
      ctx.auth.now(),
    ))
  ) {
    throw new Refusal(401, 'Wrong code.');
  }
  return false;
}

const tooMany = (): Refusal => new Refusal(429, TOO_MANY_TRIES);

/**
 * Runs the password check of one reserved attempt and ends it: a check that finds no account
 * counts on the brake, anything else (a success, or a refusal in front of the check) frees the
 * attempt's places.
 */
async function underBrake(
  attempt: Attempt,
  check: () => Promise<Account | undefined>,
): Promise<Account> {
  let wrong = false;
  try {
    const account = await check();
    if (account !== undefined) return account;
    wrong = true;
    throw new Refusal(401, SIGN_IN_FAILED);
  } finally {
    if (wrong) attempt.failed();
    else attempt.passed();
  }
}

// Sign in.
function entryRoutes(ctx: Ctx, { credentials, perAddress }: LocalAccounts): void {
  const { app, auth } = ctx;
  // The brake against guessing (D55): failed sign-ins only, per pair, account and address.
  const brake = new SignInBrake();
  const perAccount = new RateLimiter({ limit: 10, windowMs: 15 * MINUTE });

  app.post('/api/auth/sign-in', async (request, reply) => {
    const address = `address:${addressKey(request.ip)}`;
    if (brake.addressBraked(address)) throw tooMany();
    const { login, password, code } = parseBody(LocalSignInRequestSchema, request.body);
    const normal = login.includes('@') ? emailKey(login) : nameKey(login);
    const found = login.includes('@')
      ? await credentials.byEmail(normal)
      : await credentials.byName(normal);
    // An account's failures count under its id, by name or by e-mail alike; a login no
    // account has counts under its normalised form, so it answers exactly like a real one.
    const accountKey = found === undefined ? `login:${normal}` : `account:${found.accountId}`;
    const attempt = brake.reserve(accountKey, address);
    if (attempt === null) throw tooMany();
    const account = await underBrake(attempt, async () => {
      // The outer cap counts only what the brake let through.
      perAddress(request.ip);
      const matches = await passwordMatches(found?.passwordHash ?? (await dummyHash()), password);
      const known = found === undefined ? undefined : await auth.accounts.byId(found.accountId);
      return matches && known?.deleted === false ? known : undefined;
    });
    if (await secondFactorMissing(ctx, account, code, perAccount)) return { twoFactor: true };
    return signIn(ctx, request, reply, account);
  });
}

// The forgotten password and the reset through its link.
function passwordRoutes(ctx: Ctx, local: LocalAccounts): void {
  const { app, auth } = ctx;
  const forgotten = new RateLimiter({ limit: 5, windowMs: 60 * MINUTE });
  // At most 3 reset mails an hour to one address (security pass 3, finding 5).
  const perRecipient = new RateLimiter({ limit: 3, windowMs: 60 * MINUTE });
  const resets = new RateLimiter({ limit: 10, windowMs: 15 * MINUTE });

  app.post('/api/auth/forgot', (request) => {
    limited(forgotten, addressKey(request.ip));
    const { mailer } = local;
    if (mailer === null) throw new Refusal(503, 'mail is not set up on this server');
    const { email } = parseBody(ForgotRequestSchema, request.body);
    // The answer does not wait for the lookup or the mail: it is the same for every e-mail.
    if (perRecipient.take(emailKey(email)).allowed) {
      void sendReset(local, mailer, emailKey(email), auth.now()).catch(local.log);
    }
    return { ok: true };
  });

  app.post('/api/auth/reset', async (request: FastifyRequest) => {
    limited(resets, addressKey(request.ip));
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
  registerRoute(ctx, local);
  entryRoutes(ctx, local);
  passwordRoutes(ctx, local);
}

async function sendReset(local: LocalAccounts, mailer: Mailer, email: string, now: number) {
  const found = await local.credentials.byEmail(email);
  if (found === undefined) return;
  const token = randomBytes(32).toString('base64url');
  await local.credentials.addReset(tokenHash(token), found.accountId, now + RESET_MS);
  const link = `${local.publicOrigin}/reset#token=${token}`;
  await mailer.send({ to: email, subject: 'Your Seasonal Cases password', text: resetText(link) });
}
