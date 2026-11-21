/**
 * @file   packages/application/src/season.ts
 * @brief  The season of a date: the "current season" of relics and the blank (CONCEPT §6).
 *
 * Responsibility: meteorological seasons of the northern hemisphere by the UTC month:
 *                 December–February winter, March–May spring, June–August summer,
 *                 September–November autumn (night chain SC-N1 choice, NIGHT-RUN.md).
 * Depends on:     @sc/contracts (types)
 */
import type { Season } from '@sc/contracts';

const BY_MONTH: readonly Season[] = [
  'winter',
  'winter',
  'spring',
  'spring',
  'spring',
  'summer',
  'summer',
  'summer',
  'autumn',
  'autumn',
  'autumn',
  'winter',
];

/** The season the ISO time falls in. */
export function seasonOf(iso: string): Season {
  return BY_MONTH[new Date(iso).getUTCMonth()] ?? 'winter';
}
