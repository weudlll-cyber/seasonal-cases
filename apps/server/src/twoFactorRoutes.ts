/**
 * @file   apps/server/src/twoFactorRoutes.ts
 * @brief  Setting up two-factor sign-in: the status, a new secret, the confirmation.
 *
 * Responsibility: for the signed-in account (local mode, ./app.ts). `GET /api/me/2fa` says whether
 *                 it is required (a local admin) and enabled. `POST /api/me/2fa/setup` draws a new
 *                 secret (the kit's `newSecret`) and answers it as base32 text and as an
 *                 otpauth:// address for the authenticator app; only for a local admin, refused
 *                 once enabled. `POST /api/me/2fa/confirm` takes a code from that secret, enables
 *                 it once, ends the account's other sessions and answers ten new recovery codes,
 *                 shown once and stored only as hashes. `POST /api/me/2fa/recovery` re-issues
 *                 them with the password and a current code from the app (DECISIONS D35): the
 *                 old codes are void at once, the new ones shown once, and the log says it
 *                 happened, never the codes. Confirmations and re-issues are limited to 10 per 15
 *                 minutes per account (Mini Games' twoFactor rule).
 * Depends on:     @seasonal/kit/server, @sc/contracts, ./auth/*, ./http.js, ./session.js
 */
import {
  base32Encode,
  matchingStep,
  newRecoveryCodes,
  newSecret,
  otpauthUri,
  RateLimiter,
  recoveryHash,
} from '@seasonal/kit/server';
import {
  RecoveryReissueSchema,
  TwoFactorConfirmSchema,
  type RecoveryCodes,
  type TwoFactorSetup,
} from '@sc/contracts';
import type { FastifyRequest } from 'fastify';

import type { Account } from './auth/accounts.js';
import type { CredentialStore } from './auth/credentials.js';
import { passwordMatches } from './auth/passwords.js';
import { needsTwoFactor, RECOVERY_STYLE } from './auth/twoFactor.js';
import { parseBody, Refusal, signedIn, type Ctx } from './http.js';
import { sessionOf } from './session.js';

export const ISSUER = 'Seasonal Cases';
const MINUTE = 60_000;

/** The signed-in account behind the session, or a 401 refusal. */
export async function signedInAccount(ctx: Ctx, request: FastifyRequest): Promise<Account> {
  const me = await signedIn(ctx, request);
  const account = await ctx.auth.accounts.byId(me.id);
  if (account === undefined) throw new Refusal(401, 'sign in first');
  return account;
}

/** Ten new recovery codes and their hashes, to be shown once and stored. */
function freshCodes(): { codes: readonly string[]; hashes: Buffer[] } {
  const codes = newRecoveryCodes(RECOVERY_STYLE);
  return { codes, hashes: codes.map((c) => recoveryHash(c, RECOVERY_STYLE)) };
}

// New recovery codes for an account that has two-factor sign-in: password and a current code.
function reissueRoute(ctx: Ctx, credentials: CredentialStore, limiter: RateLimiter): void {
  const { app, auth } = ctx;
  app.post('/api/me/2fa/recovery', async (request): Promise<RecoveryCodes> => {
    const account = await signedInAccount(ctx, request);
    if (!limiter.take(account.id).allowed) {
      throw new Refusal(429, 'too many tries, wait a few minutes');
    }
    const { password, code } = parseBody(RecoveryReissueSchema, request.body);
    const found = await auth.twoFactor.get(account.id);
    if (found?.enabled !== true) throw new Refusal(409, 'two-factor sign-in is not set up');
    const own = await credentials.byAccount(account.id);
    if (own === undefined || !(await passwordMatches(own.passwordHash, password))) {
      throw new Refusal(401, 'Wrong password or code.');
    }
    // A current code from the app, used up like a sign-in's, so it cannot be replayed.
    const step = matchingStep(found.secret, code, auth.now(), found.lastStep);
    if (step === null || !(await auth.twoFactor.useStep(account.id, step))) {
      throw new Refusal(401, 'Wrong password or code.');
    }
    const { codes, hashes } = freshCodes();
    if (!(await auth.twoFactor.replaceRecovery(account.id, hashes))) {
      throw new Refusal(409, 'two-factor sign-in is not set up');
    }
    request.log.info({ event: 'recovery-codes-reissued', accountId: account.id });
    return { recoveryCodes: [...codes] };
  });
}

export function twoFactorRoutes(ctx: Ctx, credentials: CredentialStore): void {
  const { app, auth } = ctx;
  const confirmations = new RateLimiter({ limit: 10, windowMs: 15 * MINUTE });
  reissueRoute(ctx, credentials, confirmations);

  app.get('/api/me/2fa', async (request) => {
    const account = await signedInAccount(ctx, request);
    const found = await auth.twoFactor.get(account.id);
    return { required: needsTwoFactor(account), enabled: found?.enabled === true };
  });

  app.post('/api/me/2fa/setup', async (request): Promise<TwoFactorSetup> => {
    const account = await signedInAccount(ctx, request);
    // Only for those the sign-in asks it of (security pass, finding 10).
    if (!needsTwoFactor(account)) throw new Refusal(409, 'this account has no two-factor sign-in');
    if ((await auth.twoFactor.get(account.id))?.enabled === true) {
      throw new Refusal(409, 'two-factor sign-in is already set up');
    }
    const secret = newSecret();
    await auth.twoFactor.setUp(account.id, secret);
    return { secret: base32Encode(secret), uri: otpauthUri(secret, account.name, ISSUER) };
  });

  app.post('/api/me/2fa/confirm', async (request): Promise<RecoveryCodes> => {
    const current = await sessionOf(app, auth, request);
    if (current === null) throw new Refusal(401, 'sign in first');
    const account = await signedInAccount(ctx, request);
    if (!confirmations.take(account.id).allowed) {
      throw new Refusal(429, 'too many tries, wait a few minutes');
    }
    const { code } = parseBody(TwoFactorConfirmSchema, request.body);
    const found = await auth.twoFactor.get(account.id);
    if (found === undefined || found.enabled) throw new Refusal(409, 'set up a new secret first');
    const step = matchingStep(found.secret, code, auth.now(), null);
    if (step === null) throw new Refusal(400, 'Wrong code: check the time on your phone.');
    const { codes: recoveryCodes, hashes } = freshCodes();
    if (!(await auth.twoFactor.enable(account.id, step, hashes))) {
      throw new Refusal(409, 'two-factor sign-in is already set up');
    }
    // A session opened with the password alone elsewhere ends now; this one proved the code
    // (security pass, finding 2).
    const ended = await auth.sessions.removeOthers(account.id, current.session.id);
    if (ended.length > 0) void auth.ends.end(ended);
    return { recoveryCodes: [...recoveryCodes] };
  });
}
