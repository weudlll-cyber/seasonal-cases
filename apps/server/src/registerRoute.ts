/**
 * @file   apps/server/src/registerRoute.ts
 * @brief  `POST /api/auth/register` and `POST /api/auth/confirm`: a new standalone account, made
 *         only once the link in its mail is used, with one answer for every e-mail.
 *
 * Responsibility: DECISIONS D36 and D42. The name must meet the rule (./auth/names.ts) and must
 *                 not belong to an account: names are public on every board, so a taken name
 *                 answers 409. The e-mail never shows in the answer:
 *                 - a new e-mail makes no account, only a registration waiting for its link
 *                   (./auth/pending.ts: name, e-mail, password hash, a single-use token valid
 *                   24 h), and gets a mail with the link;
 *                 - a taken e-mail makes nothing and gets a mail that an account exists, with the
 *                   way to sign in or reset the password;
 *                 - an e-mail with a registration waiting gets the newest form's registration and
 *                   a new link, no sooner than a minute after the last mail (before that nothing
 *                   changes and nothing is sent).
 *                 Every path hashes the password and answers `{ ok: true }` no sooner than
 *                 `REGISTER_MIN_MS` after the request. Until the link is used nothing exists, so a
 *                 sign-in with the new name or e-mail answers as for any unknown one. The link
 *                 makes the account (a player of rank 0) unless its name was taken in the
 *                 meantime (409, register again); a used, replaced or expired link is refused. A
 *                 name is reserved only by an account. Limits: 5 registrations an hour and 10
 *                 confirmations per 15 minutes per address, 3 mails an hour per e-mail. Without
 *                 mail set up registration answers 503, as the forgotten password does: no link
 *                 could reach anyone.
 * Depends on:     node:crypto, @seasonal/kit/server, @sc/contracts, ./auth/*, ./http.js,
 *                 ./localRoutes.js (types), ./addressKey.js
 */
import { randomBytes, randomUUID } from 'node:crypto';

import { RateLimiter } from '@seasonal/kit/server';
import {
  ConfirmRequestSchema,
  NAME_TEXT,
  PASSWORD_TEXT,
  RegisterRequestSchema,
  type ConfirmResult,
  type RegisterRequest,
} from '@sc/contracts';

import { addressKey } from './addressKey.js';
import type { Account } from './auth/accounts.js';
import { emailKey } from './auth/credentials.js';
import { nameAllowed, nameKey } from './auth/names.js';
import { hashPassword, passwordProblem } from './auth/passwords.js';
import { PENDING_MS, RESEND_MS, type Pending } from './auth/pending.js';
import { tokenHash } from './auth/sessions.js';
import { parseBody, Refusal, type Ctx } from './http.js';
import type { LocalAccounts } from './localRoutes.js';

// Every answer takes at least this long: the slower path's work plus room (D36).
export const REGISTER_MIN_MS = 1000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const NAME_TAKEN = 'This name is already taken.';

const confirmText = (link: string): string =>
  [
    'Someone registered a Seasonal Cases account with this e-mail.',
    '',
    `Confirm it here to make the account (the link works once, for 24 hours):\n${link}`,
    '',
    'If it was not you, ignore this mail; no account is made.',
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

interface Mail {
  readonly subject: string;
  readonly text: string;
}

function checked(body: RegisterRequest): void {
  if (!nameAllowed(body.name)) throw new Refusal(400, NAME_TEXT);
  const problem = passwordProblem(body.password);
  if (problem !== null) throw new Refusal(400, PASSWORD_TEXT[problem]);
}

/** The mail this registration sends, or null when it sends none (a mail went out < 1 min ago). */
async function registered(
  local: LocalAccounts,
  body: RegisterRequest,
  now: number,
): Promise<Mail | null> {
  const passwordHash = await hashPassword(body.password);
  const email = emailKey(body.email);
  if ((await local.credentials.byEmail(email)) !== undefined) {
    return { subject: 'Your Seasonal Cases account exists', text: existsText(local.publicOrigin) };
  }
  await local.pending.purge(now);
  const waiting = await local.pending.byEmail(email, now);
  if (waiting !== undefined && now - waiting.mailedAt < RESEND_MS) return null;
  const token = randomBytes(32).toString('base64url');
  const pending: Pending = {
    tokenHash: tokenHash(token),
    email,
    name: body.name,
    passwordHash,
    expiresAt: now + PENDING_MS,
    mailedAt: now,
  };
  await local.pending.put(pending);
  const link = `${local.publicOrigin}/confirm?token=${token}`;
  return { subject: 'Confirm your Seasonal Cases account', text: confirmText(link) };
}

/** The account of a used link; a name or e-mail taken in the meantime is a 409. */
async function confirmed(ctx: Ctx, local: LocalAccounts, pending: Pending): Promise<Account> {
  if ((await local.credentials.byName(nameKey(pending.name))) !== undefined) {
    throw new Refusal(409, 'Someone took this name in the meantime: register again with another.');
  }
  const account: Account = {
    id: randomUUID(),
    kind: 'local',
    name: pending.name,
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
    nameKey: nameKey(pending.name),
    email: pending.email,
    passwordHash: pending.passwordHash,
  });
  if (made) return account;
  // Another account took the name or e-mail in between: this one never signs in.
  await ctx.auth.accounts.save({ ...account, deleted: true });
  throw new Refusal(409, 'This name or e-mail now has an account: register again or sign in.');
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });

function limited(limiter: RateLimiter, key: string): void {
  if (!limiter.take(key).allowed) throw new Refusal(429, 'too many tries, wait a few minutes');
}

export function registerRoute(ctx: Ctx, local: LocalAccounts): void {
  const registrations = new RateLimiter({ limit: 5, windowMs: HOUR });
  const confirmations = new RateLimiter({ limit: 10, windowMs: 15 * MINUTE });
  // At most 3 mails an hour to one address, so nobody floods a stranger's mailbox from many
  // networks (security pass 3, finding 5); the answer stays the same.
  const perRecipient = new RateLimiter({ limit: 3, windowMs: HOUR });

  ctx.app.post('/api/auth/register', async (request) => {
    const started = Date.now();
    // Without mail no link reaches anyone, so no registration could ever finish.
    const { mailer } = local;
    if (mailer === null) throw new Refusal(503, 'mail is not set up on this server');
    const body = parseBody(RegisterRequestSchema, request.body);
    checked(body);
    // Counted after the rules: a refused form costs the server nothing (no hash, no row).
    limited(registrations, addressKey(request.ip));
    if ((await local.credentials.byName(nameKey(body.name))) !== undefined) {
      throw new Refusal(409, NAME_TAKEN);
    }
    const mail = await registered(local, body, ctx.auth.now());
    // The answer does not wait for the mail: sending takes as long as it takes.
    if (mail !== null && perRecipient.take(emailKey(body.email)).allowed) {
      void mailer.send({ to: body.email, ...mail }).catch(local.log);
    }
    await wait(REGISTER_MIN_MS - (Date.now() - started));
    return { ok: true };
  });

  ctx.app.post('/api/auth/confirm', async (request): Promise<ConfirmResult> => {
    limited(confirmations, addressKey(request.ip));
    const { token } = parseBody(ConfirmRequestSchema, request.body);
    const pending = await local.pending.take(tokenHash(token), ctx.auth.now());
    if (pending === undefined) {
      throw new Refusal(400, 'This link no longer works: register again.');
    }
    const account = await confirmed(ctx, local, pending);
    request.log.info({ event: 'account-registered', accountId: account.id });
    return { name: account.name };
  });
}
