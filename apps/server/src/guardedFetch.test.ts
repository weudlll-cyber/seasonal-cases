/**
 * @file   apps/server/src/guardedFetch.test.ts
 * @brief  Tests the guarded fetch of the season feed: only the website's origin over https, a host
 *         that resolves to any private, loopback, link-local or mapped address is refused before a
 *         request is made, and a public one is fetched without following a redirect.
 */
import { describe, expect, it, vi } from 'vitest';

import { guardedFetch, isPrivateAddress } from './guardedFetch.js';

const ORIGIN = 'https://site.example';
const URL_OK = `${ORIGIN}/api/public/season`;

describe('isPrivateAddress', () => {
  it.each([
    '10.1.2.3',
    '127.0.0.1',
    '169.254.169.254',
    '172.20.0.1',
    '192.168.1.1',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fe80::1',
    'fd12::1',
    '::ffff:127.0.0.1',
    'not an address',
  ])('refuses %s', (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(['93.184.216.34', '8.8.8.8', '2606:2800:220:1:248:1893:25c8:1946'])(
    'lets %s through',
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    },
  );
});

describe('guardedFetch', () => {
  const answer = () => Promise.resolve(new Response('{}'));

  it('fetches the website over https from a public address, never following a redirect', async () => {
    const doFetch = vi.fn(answer);
    const read = guardedFetch(ORIGIN, () => Promise.resolve(['93.184.216.34']), doFetch);
    await read(URL_OK, { headers: { accept: 'application/json' } });
    expect(doFetch).toHaveBeenCalledWith(URL_OK, {
      headers: { accept: 'application/json' },
      redirect: 'error',
    });
  });

  it('refuses another host, plain http, and a host with any private address, without a request', async () => {
    const doFetch = vi.fn(answer);
    const mixed = guardedFetch(
      ORIGIN,
      () => Promise.resolve(['93.184.216.34', '10.0.0.5']),
      doFetch,
    );
    await expect(mixed(URL_OK, {})).rejects.toThrow('not a public address');
    const open = guardedFetch(ORIGIN, () => Promise.resolve(['93.184.216.34']), doFetch);
    await expect(open('https://other.example/api/public/season', {})).rejects.toThrow(
      'only the website',
    );
    await expect(open('http://site.example/api/public/season', {})).rejects.toThrow(
      'only the website',
    );
    const none = guardedFetch(ORIGIN, () => Promise.resolve([]), doFetch);
    await expect(none(URL_OK, {})).rejects.toThrow('not a public address');
    expect(doFetch).not.toHaveBeenCalled();
  });
});
