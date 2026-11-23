/**
 * @file   packages/ui/src/format.ts
 * @brief  Text formatting the screens share.
 *
 * Responsibility: one place for how a commitment is shortened and how a time is shown: each
 *                 viewer in their own time zone, one format everywhere (CONCEPT §7).
 * Depends on:     nothing
 */

// The result line shows "commitment <first 12 hex>".
const COMMITMENT_SHOWN = 12;

/** The first 12 hex digits of a commitment, as the screens show it. */
export function shortCommitment(commitment: string): string {
  return commitment.slice(0, COMMITMENT_SHOWN);
}

const TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** An ISO time in the viewer's own time zone, e.g. "21 Nov 2026, 21:04:09". */
export function formatTime(iso: string): string {
  return TIME.format(new Date(iso));
}
