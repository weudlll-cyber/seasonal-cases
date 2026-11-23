/**
 * @file   apps/server/src/addressLimit.ts
 * @brief  One budget per visitor's address for claims and sign-ins together: 60 a minute.
 *
 * Responsibility: DECISIONS D37. The kit's RateLimiter, keyed by ./addressKey.ts (IPv4 address,
 *                 IPv6 /64), checked after each route's own limits (20 claims a minute per
 *                 player, the sign-in's per-address and per-login limits), so many accounts from
 *                 one network cannot add their allowances up. One per server (./app.ts), shared
 *                 by the claim route and the sign-in route; a refusal is 429 with one sentence.
 * Depends on:     @seasonal/kit/server, ./addressKey.js, ./http.js
 */
import { RateLimiter } from '@seasonal/kit/server';

import { addressKey } from './addressKey.js';
import { Refusal } from './http.js';

export const ADDRESS_LIMIT = 60;
export const ADDRESS_LIMIT_TEXT = 'too many requests from your network, wait a minute';

/** Throws a 429 once the address has used its budget. */
export type AddressLimit = (ip: string) => void;

export function addressLimit(): AddressLimit {
  const limiter = new RateLimiter({ limit: ADDRESS_LIMIT, windowMs: 60_000 });
  return (ip) => {
    if (!limiter.take(addressKey(ip)).allowed) throw new Refusal(429, ADDRESS_LIMIT_TEXT);
  };
}
