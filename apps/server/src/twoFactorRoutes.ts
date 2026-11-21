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
 *                 shown once and stored only as hashes. Confirmations are limited to 10 per 15
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
import { TwoFactorConfirmSchema, type RecoveryCodes, type TwoFactorSetup } from '@sc/contracts';
import type { FastifyRequest } from 'fastify';

import type { Account } from './auth/accounts.js';
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

export function twoFactorRoutes(ctx: Ctx): void {
  const { app, auth } = ctx;
  const confirmations = new RateLimiter({ limit: 10, windowMs: 15 * MINUTE });

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
    const recoveryCodes = newRecoveryCodes(RECOVERY_STYLE);
    const hashes = recoveryCodes.map((c) => recoveryHash(c, RECOVERY_STYLE));
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
