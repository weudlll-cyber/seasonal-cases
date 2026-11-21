/**
 * @file   packages/contracts/src/api.ts
 * @brief  The HTTP shapes: development sign-in, the dev admin API, the player's claim.
 *
 * Responsibility: what the client sends and receives over /api (CONCEPT §9 prototype, §10).
 * Depends on:     zod, ./show.js
 */
import { z } from 'zod';

import { BadgeSchema, RankSchema, RoleSchema, ShowStateSchema } from './show.js';

export const NAME_MAX = 32;
export const LABEL_MAX = 60;
export const SEED_MAX = 64;

export const SignInRequestSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX),
  role: RoleSchema,
  rank: RankSchema,
});
export type SignInRequest = z.infer<typeof SignInRequestSchema>;

export const MeSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: RoleSchema,
  rank: RankSchema,
  badges: z.array(BadgeSchema),
});
export type Me = z.infer<typeof MeSchema>;

export const CreateShowRequestSchema = z.object({
  cases: z.number().int(),
  winners: z.number().int(),
  // One optional label per prize slot, in slot order (CONCEPT §3.1).
  labels: z.array(z.string().max(LABEL_MAX)),
});
export type CreateShowRequest = z.infer<typeof CreateShowRequestSchema>;

export const QuickTestRequestSchema = CreateShowRequestSchema.extend({
  seed: z.string().trim().min(1).max(SEED_MAX),
});
export type QuickTestRequest = z.infer<typeof QuickTestRequestSchema>;

export const ShowSummarySchema = z.object({
  id: z.string(),
  state: ShowStateSchema,
  caseCount: z.number().int(),
  winnerCount: z.number().int(),
  createdAt: z.string(),
});
export type ShowSummary = z.infer<typeof ShowSummarySchema>;

export const ClaimRequestSchema = z.object({ caseNumber: z.number().int().min(1) });
export type ClaimRequest = z.infer<typeof ClaimRequestSchema>;

// Every refusal answers with one sentence the client can show.
export const ApiErrorSchema = z.object({ error: z.string() });
export type ApiError = z.infer<typeof ApiErrorSchema>;
