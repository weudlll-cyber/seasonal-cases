/**
 * @file   packages/contracts/src/artifact.ts
 * @brief  Artifacts and prize slots as they cross the wire (CONCEPT §3.1, §6).
 *
 * Responsibility: an artifact's identity, name, season colour and the prize slot it stands for
 *                 (null: no prize); a prize slot's number and its optional label; the words for
 *                 a prize, an owner, a winner and a number of things, so every screen and the
 *                 server say the same.
 * Depends on:     zod, ./show.js
 */
import { z } from 'zod';

import { SeasonSchema } from './show.js';

// 'all': the four seasons rotating (the main prize); 'none': no season colour.
export const ArtifactSeasonSchema = z.union([SeasonSchema, z.literal('all'), z.literal('none')]);
export type ArtifactSeason = z.infer<typeof ArtifactSeasonSchema>;

export const ArtifactSchema = z.object({
  id: z.string(),
  name: z.string(),
  season: ArtifactSeasonSchema,
  prizeSlot: z.number().int().min(1).nullable(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

// The label is shown as typed; an empty one is shown as "Prize <slot>" (CONCEPT §3.1).
export const PrizeSlotSchema = z.object({
  slot: z.number().int().min(1),
  label: z.string(),
});
export type PrizeSlot = z.infer<typeof PrizeSlotSchema>;

/**
 * How every screen names a prize: "Prize 2" without a label, "Prize 1 · Gold" with one. The slot
 * is named once; a label that only repeats "Prize n" counts as none (SC-N3 piece 1).
 */
export function prizeName(slot: number, label: string): string {
  const own = label.trim();
  const plain = `Prize ${String(slot)}`;
  return own === '' || own === plain ? plain : `${plain} · ${own}`;
}

/** A prize slot's name (`prizeName`). */
export const prizeTitle = (slot: PrizeSlot): string => prizeName(slot.slot, slot.label);

/** "1 prize", "2 prizes": a number with its noun, whose plural takes an "s". */
export function counted(n: number, noun: string): string {
  return `${String(n)} ${noun}${n === 1 ? '' : 's'}`;
}

/**
 * How every screen names a case's owner: the name, or "Unclaimed" for a case nobody claimed
 * (DECISIONS D34; real shows get no bots).
 */
export const ownerText = (name: string | null): string => name ?? 'Unclaimed';

/** How every screen names a prize's winner: the owner, or "not won" in an unclaimed case (D34). */
export const winnerText = (name: string | null): string => name ?? 'not won';
