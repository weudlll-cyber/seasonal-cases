/**
 * @file   apps/server/src/addressLimit.ts
 * @brief  The budgets per visitor's address: sign-ins 20 a minute, claims 300 a minute, each its
 *         own.
 *
 * Responsibility: DECISIONS D45 (in place of D37's one shared 60). The kit's RateLimiter, keyed
 *                 by ./addressKey.ts (IPv4 address, IPv6 /64), checked beside each route's own
 *                 limits (20 claims a minute per player; 5 sign-ins per 15 minutes per login and
 *                 address), so many accounts from one network cannot add their allowances up. A
 *                 room of players on one network signs in at 20 a minute and claims at 300 a
 *                 minute, and the one never uses up the other. One of each per server
 *                 (./app.ts); a refusal is 429 with one sentence.
 * Depends on:     @seasonal/kit/server, ./addressKey.js, ./http.js
 */
import { RateLimiter } from '@seasonal/kit/server';

import { addressKey } from './addressKey.js';
import { Refusal } from './http.js';

export const SIGN_IN_ADDRESS_LIMIT = 20;
export const CLAIM_ADDRESS_LIMIT = 300;
const ADDRESS_LIMIT_TEXT = 'too many requests from your network, wait a minute';

/** Throws a 429 once the address has used its budget. */
export type AddressLimit = (ip: string) => void;

/** A budget of `limit` requests a minute per address. */
export function addressLimit(limit: number): AddressLimit {
  const limiter = new RateLimiter({ limit, windowMs: 60_000 });
  return (ip) => {
    if (!limiter.take(addressKey(ip)).allowed) throw new Refusal(429, ADDRESS_LIMIT_TEXT);
  };
}
