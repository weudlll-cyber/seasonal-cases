/**
 * @file   apps/server/src/guardedFetch.ts
 * @brief  The game's guarded fetch for the kit's season feed reader (kit handbook, Security).
 *
 * Responsibility: reads one origin and nothing else: https only, the host resolved first and
 *                 refused when any address is private, loopback or link-local, no redirect
 *                 followed. The kit has no fetch of its own and says the game passes this one.
 *                 What it cannot do is pin the address the connection then uses (a name that
 *                 changes between the lookup and the request); the origin is the operator's own
 *                 configuration, never a URL a visitor handed in, so that gap stays shut.
 * Depends on:     node:dns/promises, node:net
 */
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

// Everything that is not a public unicast address of the two families. An IPv4-mapped IPv6
// address (::ffff:a.b.c.d) is checked against the IPv4 rules by the BlockList itself.
const PRIVATE = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  PRIVATE.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  PRIVATE.addSubnet(net, prefix, 'ipv6');
}

/** Whether the address is one a public website can never have. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  return PRIVATE.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

type Resolve = (host: string) => Promise<readonly string[]>;

const resolveAll: Resolve = async (host) =>
  (await lookup(host, { all: true })).map((entry) => entry.address);

/** A fetch that reads only `origin`, over https, from public addresses, without redirects. */
export function guardedFetch(
  origin: string,
  resolve: Resolve = resolveAll,
  doFetch: typeof fetch = fetch,
): (url: string, init: RequestInit) => Promise<Response> {
  const allowed = new URL(origin);
  return async (url, init) => {
    const target = new URL(url);
    if (target.protocol !== 'https:' || target.origin !== allowed.origin) {
      throw new Error('guarded fetch: only the website over https');
    }
    const addresses =
      isIP(target.hostname) === 0 ? await resolve(target.hostname) : [target.hostname];
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
      throw new Error('guarded fetch: the host is not a public address');
    }
    return doFetch(url, { ...init, redirect: 'error' });
  };
}
