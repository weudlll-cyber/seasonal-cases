/**
 * @file   apps/server/src/socketAddress.ts
 * @brief  The visitor's address behind a socket, as Fastify finds it for a request.
 *
 * Responsibility: socket.io's handshake bypasses Fastify, so its `request.ip` is not there. The
 *                 TCP peer is the visitor, unless it is one of the trusted proxies (the same
 *                 SC_TRUSTED_PROXIES as Fastify's `trustProxy`, ./app.ts): then X-Forwarded-For is
 *                 read from the right past every trusted hop, as Fastify does with a list, and the
 *                 first other hop is the visitor. A forwarding header from anyone else is ignored
 *                 (security pass, finding 1). The kit's `trustedPeers` knows addresses and CIDRs,
 *                 not Fastify's keywords such as `loopback` (docs/CONFIG.md). `clappers` gives a
 *                 socket's clapper for the applause limit: its account, or for a guest its
 *                 address (./applause.ts, DECISIONS D44).
 * Depends on:     node:http (types), @seasonal/kit/server (trustedPeers), ./applause.js (types)
 */
import type { IncomingHttpHeaders } from 'node:http';

import { trustedPeers } from '@seasonal/kit/server';

import type { Clapper } from './applause.js';

export interface Handshake {
  readonly address: string;
  readonly headers: IncomingHttpHeaders;
}

export function visitorAddress(proxies: readonly string[]): (handshake: Handshake) => string {
  const trusted = trustedPeers(proxies);
  return ({ address, headers }) => {
    if (!trusted(address)) return address;
    const forwarded = headers['x-forwarded-for'];
    const hops = (Array.isArray(forwarded) ? forwarded.join(',') : (forwarded ?? ''))
      .split(',')
      .map((hop) => hop.trim())
      .filter((hop) => hop !== '');
    // From the right, past every trusted proxy: the first hop no proxy of ours added.
    const visitor = [...hops].reverse().find((hop) => !trusted(hop));
    return visitor ?? hops[0] ?? address;
  };
}

/** A socket's clapper: its id, its account (null for a guest) and its visitor's address. */
export function clappers(
  proxies: readonly string[],
): (socket: { id: string; handshake: Handshake }, me: { id: string } | null) => Clapper {
  const addressOf = visitorAddress(proxies);
  return (socket, me) => ({
    socketId: socket.id,
    accountId: me?.id ?? null,
    address: addressOf(socket.handshake),
  });
}
