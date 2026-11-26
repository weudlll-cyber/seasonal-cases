/**
 * @file   packages/contracts/src/show.ts
 * @brief  The show's basic vocabulary: life states, roles, ranks, seasons, reveal steps.
 *
 * Responsibility: the one list of each enumeration every layer and the client share
 *                 (CONCEPT §2, §3, §3.4, §4, §6).
 * Depends on:     zod
 */
import { z } from 'zod';

// SETUP → REGISTRATION → SEALED → LIVE → ENDED (CONCEPT §3).
export const SHOW_STATES = ['setup', 'registration', 'sealed', 'live', 'ended'] as const;
export const ShowStateSchema = z.enum(SHOW_STATES);
export type ShowState = z.infer<typeof ShowStateSchema>;

// The organiser's rights belong to admin in the prototype (CONCEPT §2, §9).
export const ROLES = ['viewer', 'player', 'organiser', 'admin'] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

// Prototype ranks 0–5; 0 = unassigned, the lowest (CONCEPT §4).
export const RANK_MAX = 5;
export const RankSchema = z.number().int().min(0).max(RANK_MAX);
export type Rank = z.infer<typeof RankSchema>;

export const SEASONS = ['winter', 'spring', 'summer', 'autumn'] as const;
export const SeasonSchema = z.enum(SEASONS);
export type Season = z.infer<typeof SeasonSchema>;

// idle: no case at the front; selected (the click on a case, lights down), then the
// organiser's steps open and owner (CONCEPT §3.4, v1.1).
export const REVEAL_STEPS = ['idle', 'selected', 'open', 'owner'] as const;
export const RevealStepSchema = z.enum(REVEAL_STEPS);
export type RevealStep = z.infer<typeof RevealStepSchema>;

// A website member's step, as the kit's `Step` has it (`stepShape.ts`): the kit's step badges
// draw these beside a name, at most three, and check each icon's address themselves.
export const StepSchema = z.object({
  ladder: z.enum(['holder', 'farmer', 'investor']),
  name: z.string(),
  icon: z.string().nullable(),
});
export type Step = z.infer<typeof StepSchema>;

/** Whether a role may lead a show (direction, dev admin). */
export function canDirect(role: Role): boolean {
  return role === 'organiser' || role === 'admin';
}
