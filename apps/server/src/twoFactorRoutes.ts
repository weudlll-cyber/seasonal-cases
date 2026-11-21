/**
 * @file   apps/server/src/twoFactorRoutes.ts
 * @brief  Setting up two-factor sign-in: the status, a new secret, the confirmation.
 *
 * Responsibility: for the signed-in account (local mode, ./app.ts). `GET /api/me/2fa` says whether
 *                 it is required (a local admin) and enabled. `POST /api/me/2fa/setup` draws a new
 *                 secret (the kit's `newSecret`) and answers it as base32 text and as an
 *                 otpauth:// address for the authenticator app; refused once enabled.
 *                 `POST /api/me/2fa/confirm` takes a code from that secret, enables it and answers
 *                 ten new recovery codes, shown once and stored only as hashes. Confirmations are
 *                 limited to 10 per 15 minutes per account (Mini Games' twoFactor rule).
 * Depends on:     @seasonal/kit/server, @sc/contracts, ./auth/*, ./http.js
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
    if (account.kind !== 'local') throw new Refusal(409, 'this account signs in elsewhere');
    if ((await auth.twoFactor.get(account.id))?.enabled === true) {
      throw new Refusal(409, 'two-factor sign-in is already set up');
    }
    const secret = newSecret();
    await auth.twoFactor.setUp(account.id, secret);
    return { secret: base32Encode(secret), uri: otpauthUri(secret, account.name, ISSUER) };
  });

  app.post('/api/me/2fa/confirm', async (request): Promise<RecoveryCodes> => {
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
    await auth.twoFactor.enable(account.id, step, hashes);
    return { recoveryCodes: [...recoveryCodes] };
  });
}
