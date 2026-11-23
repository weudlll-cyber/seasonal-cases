/**
 * @file   apps/server/src/socketAddress.test.ts
 * @brief  Tests the visitor's address behind a socket: the peer, or the trusted proxy's
 *         forwarding entry, and nobody else's.
 */
import { describe, expect, it } from 'vitest';

import { clappers, visitorAddress } from './socketAddress.js';

const behind = visitorAddress(['127.0.0.1', '172.16.0.0/12']);

describe('the visitor address of a socket', () => {
  it('is the peer when the peer is no trusted proxy, whatever it forwards', () => {
    expect(behind({ address: '203.0.113.5', headers: { 'x-forwarded-for': '10.0.0.1' } })).toBe(
      '203.0.113.5',
    );
  });

  it('is the last forwarding entry when a trusted proxy or range connects', () => {
    const headers = { 'x-forwarded-for': '1.2.3.4, 198.51.100.7' };
    expect(behind({ address: '127.0.0.1', headers })).toBe('198.51.100.7');
    expect(behind({ address: '172.18.0.3', headers })).toBe('198.51.100.7');
  });

  it('walks past every trusted hop from the right, as Fastify does', () => {
    const headers = { 'x-forwarded-for': '198.51.100.7, 172.20.0.9' };
    expect(behind({ address: '127.0.0.1', headers })).toBe('198.51.100.7');
    // Only trusted hops: the leftmost is the visitor.
    expect(behind({ address: '127.0.0.1', headers: { 'x-forwarded-for': '172.20.0.2' } })).toBe(
      '172.20.0.2',
    );
  });

  it('is the proxy itself when it forwards nothing', () => {
    expect(behind({ address: '127.0.0.1', headers: {} })).toBe('127.0.0.1');
    expect(behind({ address: '127.0.0.1', headers: { 'x-forwarded-for': ' , ' } })).toBe(
      '127.0.0.1',
    );
  });

  it('makes a clapper of the account, or of the address for a guest', () => {
    const of = clappers([]);
    const socket = { id: 's1', handshake: { address: '203.0.113.5', headers: {} } };
    expect(of(socket, { id: 'ana' })).toEqual({
      socketId: 's1',
      accountId: 'ana',
      address: '203.0.113.5',
    });
    expect(of(socket, null).accountId).toBeNull();
  });
});
