/**
 * @file   packages/contracts/src/accounts.ts
 * @brief  The shapes of standalone accounts: registration, sign-in, forgotten password, the
 *         admin's account list, and a player's matches.
 *
 * Responsibility: what the client and the server send for local accounts (DECISIONS D24). The
 *                 name and password rules are those of seasonal-mini-games: a name of 3 to 24
 *                 letters or digits (also _ . -), unique without regard to case; a password of
 *                 12 to 128 characters, not a common one (checked on the server). Sign-in takes
 *                 the name or the e-mail.
 * Depends on:     zod, ./show.js
 */
import { z } from 'zod';

import { RankSchema, ShowStateSchema } from './show.js';

export const ACCOUNT_NAME = /^[\p{L}\p{N}_.-]{3,24}$/u;
export const EMAIL_MAX = 254;
export const PASSWORD_LIMIT = 128;

export const PASSWORD_PROBLEMS = ['tooShort', 'tooLong', 'tooCommon'] as const;
export type PasswordProblem = (typeof PASSWORD_PROBLEMS)[number];

/** The sentence the client shows for each problem (Mini Games' wording). */
export const PASSWORD_TEXT: Record<PasswordProblem, string> = {
  tooShort: 'The password needs at least 12 characters.',
  tooLong: 'The password can have at most 128 characters.',
  tooCommon: 'This password is too common. Please choose another.',
};

export const NAME_TEXT = 'The name needs 3 to 24 letters or digits (also _ . or -), no spaces.';

export const RegisterRequestSchema = z.object({
  name: z.string().trim().regex(ACCOUNT_NAME, NAME_TEXT),
  email: z.email().max(EMAIL_MAX),
  password: z.string().max(PASSWORD_LIMIT),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LocalSignInRequestSchema = z.object({
  // The name or the e-mail.
  login: z.string().trim().min(1).max(EMAIL_MAX),
  password: z.string().min(1).max(PASSWORD_LIMIT),
});
export type LocalSignInRequest = z.infer<typeof LocalSignInRequestSchema>;

export const ForgotRequestSchema = z.object({ email: z.email().max(EMAIL_MAX) });
export type ForgotRequest = z.infer<typeof ForgotRequestSchema>;

export const ResetRequestSchema = z.object({
  token: z.string().min(16).max(128),
  password: z.string().max(PASSWORD_LIMIT),
});
export type ResetRequest = z.infer<typeof ResetRequestSchema>;

// The roles an admin assigns; a viewer is anyone not signed in, never an account's role.
export const ACCOUNT_ROLES = ['player', 'organiser', 'admin'] as const;
export const AccountRoleSchema = z.enum(ACCOUNT_ROLES);
export type AccountRoleName = z.infer<typeof AccountRoleSchema>;

export const AccountRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['dev', 'local', 'website']),
  role: AccountRoleSchema,
  rank: RankSchema,
});
export type AccountRow = z.infer<typeof AccountRowSchema>;

export const AccountUpdateSchema = z
  .object({ role: AccountRoleSchema.optional(), rank: RankSchema.optional() })
  .refine((u) => u.role !== undefined || u.rank !== undefined, 'nothing to change');
export type AccountUpdate = z.infer<typeof AccountUpdateSchema>;

/** One of a player's cases (My matches): its prize only once its case is open. */
export const MatchSchema = z.object({
  showId: z.string(),
  state: ShowStateSchema,
  createdAt: z.string(),
  caseNumber: z.number().int(),
  // Whether the player owns the case (after the close), or only asked for it.
  owner: z.boolean(),
  prize: z.string().nullable(),
});
export type Match = z.infer<typeof MatchSchema>;
