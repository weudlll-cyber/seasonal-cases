/**
 * @file   apps/server/src/websiteRoutes.ts
 * @brief  Website mode's sign-in: `<base>auth/website` and its login hop
 *         `<base>auth/website/login` (GAME-INTEGRATION §2–§3, AUTH.md "Embedded games").
 *
 * Responsibility: the only place that reads the website's identity headers. The kit's
 *                 `websiteSignInCheck` (steps 'each', as Mini Games) decides: an untrusted peer
 *                 or a wrong proxy secret (`X-Sc-Proxy-Secret`) 403; a guest goes to the
 *                 website's login and back (`websiteLoginLocation`); an invalid identity 403
 *                 NO_WEBSITE_USER; a member gets the account keyed by (website origin, website
 *                 user id), its name, role, rank and badges brought up to date, a rotated
 *                 7-day session, and a redirect to `next` when it is a path under the base path
 *                 (`safeNext`). Both routes are rate-limited per address (Mini Games' rule:
 *                 30 a minute). Website mode only (./app.ts).
 * Depends on:     node:crypto, fastify, @seasonal/kit/server, @sc/contracts, ./auth/accounts.js,
 *                 ./config.js, ./http.js, ./session.js
 */
import { randomUUID } from 'node:crypto';

import {
  mappedRoles,
  RateLimiter,
  safeNext,
  websiteLoginLocation,
  websiteSignInCheck,
  type WebsiteIdentity,
} from '@seasonal/kit/server';
import { RANK_MAX } from '@sc/contracts';
import type { FastifyReply } from 'fastify';

import { addressKey } from './addressKey.js';
import type { Account, AccountRole, AccountStore } from './auth/accounts.js';
import { PROXY_SECRET_HEADER, type WebsiteConfig } from './config.js';
import type { Ctx } from './http.js';
import { signIn } from './session.js';

type NextQuery = { Querystring: { next?: string } };

const RATE = { limit: 30, windowMs: 60_000 };

/** The game role of a website identity: admin → admin, may host → organiser, else player. */
export function roleOf(who: Pick<WebsiteIdentity, 'roles' | 'canHost'>): AccountRole {
  const mapped = mappedRoles(who);
  if (mapped.includes('game_admin')) return 'admin';
  return mapped.includes('organizer') ? 'organiser' : 'player';
}

/** The rank in website mode: the number of valid Discord steps, at most RANK_MAX. */
export function rankOf(who: Pick<WebsiteIdentity, 'steps'>): number {
  return Math.min(RANK_MAX, who.steps.length);
}

/** The member's account, created on the first sign-in and brought up to date on each. */
export async function websiteAccount(
  accounts: AccountStore,
  origin: string,
  who: WebsiteIdentity,
): Promise<Account> {
  const known = await accounts.byWebsite(origin, who.subject);
  // A deleted account stays as the feed left it: no name comes back (security pass, 14).
  if (known?.deleted === true) return known;
  const account: Account = {
    id: known?.id ?? randomUUID(),
    kind: 'website',
    name: who.displayName,
    role: roleOf(who),
    rank: rankOf(who),
    // Only icons in the contract's exact form ever reach a page (the kit checks each).
    badges: who.steps.flatMap((s) => (s.icon === null ? [] : [s.icon])),
    websiteOrigin: origin,
    websiteUserId: who.subject,
    deleted: false,
  };
  await accounts.save(account);
  return account;
}

function tooMany(reply: FastifyReply) {
  return reply.status(429).send({ error: 'too many sign-ins, try again in a minute' });
}

export function websiteRoutes(ctx: Ctx, website: WebsiteConfig): void {
  const { app, auth, config } = ctx;
  const base = config.basePath;
  const check = websiteSignInCheck({
    trustedProxies: website.trustedProxies,
    proxySecret: website.proxySecret,
    secretHeader: PROXY_SECRET_HEADER,
    steps: 'each',
  });
  const loginLimit = new RateLimiter(RATE);
  const signInLimit = new RateLimiter(RATE);

  app.get<NextQuery>('/auth/website/login', (request, reply) => {
    reply.header('cache-control', 'no-store');
    if (!loginLimit.take(addressKey(request.ip)).allowed) return tooMany(reply);
    return reply.redirect(websiteLoginLocation(website.loginPath, base, request.query.next), 302);
  });

  app.get<NextQuery>('/auth/website', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    if (!signInLimit.take(addressKey(request.ip)).allowed) return tooMany(reply);
    // The TCP peer, never a forwarding header: only the website's proxy names a visitor.
    const decision = check(request.socket.remoteAddress, request.headers);
    if (decision.kind === 'untrusted') return reply.status(403).send({ error: 'UNTRUSTED_PROXY' });
    if (decision.kind === 'guest') {
      return reply.redirect(websiteLoginLocation(website.loginPath, base, request.query.next), 302);
    }
    if (decision.kind === 'invalid') return reply.status(403).send({ error: 'NO_WEBSITE_USER' });
    const account = await websiteAccount(auth.accounts, website.origin, decision.identity);
    if (account.deleted) return reply.status(403).send({ error: 'ACCOUNT_DELETED' });
    await signIn(ctx, request, reply, account);
    return reply.redirect(safeNext(request.query.next, base), 302);
  });
}
