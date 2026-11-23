/**
 * @file   apps/server/src/addressKey.ts
 * @brief  The key a visitor's address is counted by in a rate limit.
 *
 * Responsibility: an IPv4 address counts as itself; an IPv6 address counts by its /64, the
 *                 smallest network a provider hands one customer, as the kit's RateLimiter asks
 *                 of games (its header: "Games key by account and by IPv6 /64"). One customer
 *                 with millions of addresses is then one key, and cannot fill the limiter's key
 *                 cap or guess passwords from fresh addresses (security pass 2, finding 2). An
 *                 IPv4 address written as IPv6 (::ffff:a.b.c.d) counts as the IPv4 address.
 * Depends on:     nothing
 */

const MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

export function addressKey(ip: string): string {
  const address = ip.split('%')[0] ?? ip;
  if (!address.includes(':')) return address;
  const mapped = MAPPED.exec(address);
  if (mapped?.[1] !== undefined) return mapped[1];
  const [head = '', tail = ''] = address.split('::');
  const front = head === '' ? [] : head.split(':');
  const back = address.includes('::') && tail !== '' ? tail.split(':') : [];
  const missing = 8 - front.length - back.length;
  const groups = [...front, ...Array<string>(Math.max(missing, 0)).fill('0'), ...back];
  const network = groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, ''));
  return `${network.join(':')}::/64`;
}
