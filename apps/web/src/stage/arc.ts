/**
 * @file   apps/web/src/stage/arc.ts
 * @brief  Where each case sits on the stage's half circle: pure layout geometry.
 *
 * Responsibility: spread N cases over one to four concentric half circles, about 16 per ring,
 *                 each ring holding a share in proportion to its length, left to right, as
 *                 percentages of the arena's box (about twice as wide as high). A presentation
 *                 helper only; it knows nothing of the show's rules.
 * Depends on:     nothing
 */

export interface Spot {
  readonly x: number;
  readonly y: number;
}

const PER_RING = 16;
const MAX_RINGS = 4;
// The outer ring's radius in % of the arena's width, and how far each inner ring steps in.
const OUTER = 45;
const STEP = 11;
// Height per width of the arena's box, inverted: a radius in % of the width is this many % of
// the height. Slightly under 2 leaves a margin at the top.
const ASPECT = 1.9;
// The half circle's centre, % from the top.
const BASE = 94;
// The arc runs from 10 % to 90 % of the half turn, so its ends stay clear of the bottom
// corners, where the lower third appears at the "Owner" step.
const FROM = 0.1;
const SPAN = 0.8;

/** The radius of each ring, outer first, for n cases. */
function radii(n: number): number[] {
  const count = Math.min(MAX_RINGS, Math.max(1, Math.ceil(n / PER_RING)));
  return Array.from({ length: count }, (_, r) => OUTER - r * STEP);
}

/** How many cases each ring holds, outer first: in proportion to the ring's radius. */
export function ringSizes(n: number): number[] {
  const rs = radii(n);
  const total = rs.reduce((a, b) => a + b, 0);
  const sizes = rs.map((r) => Math.round((n * r) / total));
  // Rounding may miss by a case or two; the outer ring takes the difference.
  sizes[0] = (sizes[0] ?? 0) + n - sizes.reduce((a, b) => a + b, 0);
  return sizes;
}

/** A case's width on the half circle before scaling: fewer cases, larger cases. */
export function tokenSize(n: number): number {
  if (n <= 12) return 96;
  if (n <= 24) return 80;
  return n <= 48 ? 64 : 52;
}

/** The spot of every case, in case order, as % of the arena (x from the left, y from the top). */
export function arcSpots(n: number): Spot[] {
  const rs = radii(n);
  const spots: Spot[] = [];
  ringSizes(n).forEach((size, ring) => {
    const radius = rs[ring] ?? OUTER;
    for (let i = 0; i < size; i += 1) {
      const angle = Math.PI * (1 - FROM - ((i + 0.5) / size) * SPAN);
      spots.push({
        x: 50 + Math.cos(angle) * radius,
        y: BASE - Math.sin(angle) * radius * ASPECT,
      });
    }
  });
  return spots;
}
