/**
 * @file   apps/web/src/lib/linkToken.ts
 * @brief  The token of a mailed link, read from the address's fragment (`#token=...`, D63).
 *
 * Responsibility: a password reset's and a registration's token travel after the link's `#`, which
 *                 a browser never sends to a server: not in a request line, not in a log, not in
 *                 a `Referer`. The page reads it once; `spendToken` takes it off the address when
 *                 it is used, so a reload shows no dead link.
 * Depends on:     (browser only)
 */

/** The token in the address's fragment, or an empty string. */
export function linkToken(): string {
  return new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') ?? '';
}

/** Takes the fragment off the address (the token is spent). */
export function spendToken(): void {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
