/**
 * @file   apps/server/src/addressKey.test.ts
 * @brief  Tests the rate-limit key of an address: IPv4 itself, IPv6 by its /64.
 */
import { describe, expect, it } from 'vitest';

import { addressKey } from './addressKey.js';

describe('addressKey', () => {
  it('keeps an IPv4 address, also when written as IPv6', () => {
    expect(addressKey('203.0.113.9')).toBe('203.0.113.9');
    expect(addressKey('::ffff:203.0.113.9')).toBe('203.0.113.9');
  });

  it('puts every address of one /64 under one key', () => {
    const key = addressKey('2001:db8:aa:bb::1');
    expect(addressKey('2001:0db8:00aa:00bb:ffff:1:2:3')).toBe(key);
    expect(addressKey('2001:DB8:AA:BB:1::')).toBe(key);
    expect(addressKey('2001:db8:aa:bb::1%eth0')).toBe(key);
    expect(key).toBe('2001:db8:aa:bb::/64');
  });

  it('keeps different /64s apart, and the short forms right', () => {
    expect(addressKey('2001:db8:aa:bc::1')).not.toBe(addressKey('2001:db8:aa:bb::1'));
    expect(addressKey('::1')).toBe('0:0:0:0::/64');
    expect(addressKey('fe80::1')).toBe('fe80:0:0:0::/64');
  });
});
