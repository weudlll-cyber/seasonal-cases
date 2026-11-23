/**
 * @file   packages/contracts/src/accounts.ts
 * @brief  The shapes of standalone accounts: registration, sign-in with two-factor sign-in,
 *         forgotten password, the admin's account list, and a player's matches.
 *
 * Responsibility: what the client and the server send for local accounts (DECISIONS D24). The
 *                 name rule is the owner's (DECISIONS D36): 3 to 32 Latin letters (with
 *                 diacritics), digits, `-` and `_`, checked on the server
 *                 (apps/server/src/auth/names.ts); a password of 12 to 128 characters, not a
 *                 common one (checked on the server). Sign-in takes the name or the e-mail.
 * Depends on:     zod, ./show.js
 */
import { z } from 'zod';

import { RankSchema, ShowStateSchema } from './show.js';

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

export const NAME_TEXT =
  'The name needs 3 to 32 Latin letters (é and ß too) or digits, also - and _, no spaces, and at least one letter.';

export const RegisterRequestSchema = z.object({
  // The shape only; the rule is the server's (D36). NFC: "é" typed as e + accent is one letter.
  name: z.string().trim().normalize('NFC').min(1).max(64),
  email: z.email().max(EMAIL_MAX),
  password: z.string().max(PASSWORD_LIMIT),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// A six-digit TOTP code or a recovery code ("xxxx-xxxx").
export const TwoFactorCodeSchema = z.string().trim().min(6).max(20);

export const LocalSignInRequestSchema = z.object({
  // The name or the e-mail.
  login: z.string().trim().min(1).max(EMAIL_MAX),
  password: z.string().min(1).max(PASSWORD_LIMIT),
  // Only for an account with two-factor sign-in, after the server asked for it.
  code: TwoFactorCodeSchema.optional(),
});
export type LocalSignInRequest = z.infer<typeof LocalSignInRequestSchema>;

/** The sign-in's answer when the password is right and the second factor is still missing. */
export const TwoFactorNeededSchema = z.object({ twoFactor: z.literal(true) });
export type TwoFactorNeeded = z.infer<typeof TwoFactorNeededSchema>;

/** Whether the signed-in account must use two-factor sign-in, and whether it is set up. */
export const TwoFactorStatusSchema = z.object({ required: z.boolean(), enabled: z.boolean() });
export type TwoFactorStatus = z.infer<typeof TwoFactorStatusSchema>;

/** A new secret for the authenticator app: as text and as an otpauth:// address. */
export const TwoFactorSetupSchema = z.object({ secret: z.string(), uri: z.string() });
export type TwoFactorSetup = z.infer<typeof TwoFactorSetupSchema>;

export const TwoFactorConfirmSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});
export type TwoFactorConfirm = z.infer<typeof TwoFactorConfirmSchema>;

/** New recovery codes: the password and a current code from the app (DECISIONS D35). */
export const RecoveryReissueSchema = TwoFactorConfirmSchema.extend({
  password: z.string().min(1).max(PASSWORD_LIMIT),
});
export type RecoveryReissue = z.infer<typeof RecoveryReissueSchema>;

/** The recovery codes, shown once when two-factor sign-in is enabled or they are re-issued. */
export const RecoveryCodesSchema = z.object({ recoveryCodes: z.array(z.string()) });
export type RecoveryCodes = z.infer<typeof RecoveryCodesSchema>;

export const ForgotRequestSchema = z.object({ email: z.email().max(EMAIL_MAX) });
export type ForgotRequest = z.infer<typeof ForgotRequestSchema>;

export const ResetRequestSchema = z.object({
  token: z.string().min(16).max(128),
  password: z.string().max(PASSWORD_LIMIT),
});
export type ResetRequest = z.infer<typeof ResetRequestSchema>;

// The registration's confirmation link (D42): its token, once; the answer names the new account.
export const ConfirmRequestSchema = z.object({ token: z.string().min(16).max(128) });
export type ConfirmRequest = z.infer<typeof ConfirmRequestSchema>;
export const ConfirmResultSchema = z.object({ name: z.string() });
export type ConfirmResult = z.infer<typeof ConfirmResultSchema>;

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
