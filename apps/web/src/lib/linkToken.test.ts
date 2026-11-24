/**
 * @file   apps/web/src/lib/linkToken.test.ts
 * @brief  Tests the mailed links' token (D63): it is read from the fragment only, never from the
 *         query (a query reaches the server and its logs), and taken off the address when spent.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { linkToken, spendToken } from './linkToken.js';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('the mailed link token', () => {
  it('is read from the fragment', () => {
    window.history.replaceState(null, '', '/reset#token=abc-DEF_123');
    expect(linkToken()).toBe('abc-DEF_123');
  });

  it('is not taken from the query, and is empty without one', () => {
    window.history.replaceState(null, '', '/reset?token=from-the-query');
    expect(linkToken()).toBe('');
  });

  it('goes off the address when it is spent, keeping the path', () => {
    window.history.replaceState(null, '', '/confirm#token=abc');
    spendToken();
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/confirm');
    expect(linkToken()).toBe('');
  });
});
