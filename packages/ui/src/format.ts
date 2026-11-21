/**
 * @file   packages/ui/src/format.ts
 * @brief  Text formatting the screens share.
 *
 * Responsibility: one place for how a commitment is shortened on screen.
 * Depends on:     nothing
 */

// The result line shows "commitment <first 12 hex>" (night chain SC-N1, piece 3).
const COMMITMENT_SHOWN = 12;

/** The first 12 hex digits of a commitment, as the screens show it. */
export function shortCommitment(commitment: string): string {
  return commitment.slice(0, COMMITMENT_SHOWN);
}
