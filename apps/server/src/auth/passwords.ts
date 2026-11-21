/**
 * @file   apps/server/src/auth/passwords.ts
 * @brief  Passwords of standalone accounts: the rules, the hash, the check.
 *
 * Responsibility: the rules of seasonal-mini-games apps/server/src/auth/password.ts: 12 to 128
 *                 characters, not a common password, no character classes. "Common" is Mini
 *                 Games' ten plus the 49 233 of `@zxcvbn-ts/language-common` (MIT; security pass
 *                 finding 11, SC-N3 piece 1), compared in lower case. Argon2id with its parameters
 *                 (64 MiB, 3 passes, 1 lane). A sign-in for an unknown name checks a dummy hash,
 *                 so it takes as long as a wrong password.
 * Depends on:     node:crypto, @node-rs/argon2, @zxcvbn-ts/language-common, @sc/contracts (types)
 */
import { randomBytes } from 'node:crypto';

import { hash, verify } from '@node-rs/argon2';
import { dictionary } from '@zxcvbn-ts/language-common';
import type { PasswordProblem } from '@sc/contracts';

const OPTIONS = { algorithm: 2, memoryCost: 65_536, timeCost: 3, parallelism: 1 } as const;

// Mini Games' list, kept as it is; the dictionary follows below.
const MINI_GAMES = [
  'password1234',
  '123456789012',
  'qwertyuiopas',
  'iloveyou1234',
  'passwordpassword',
  'letmein12345',
  'abcdefghijkl',
  '111111111111',
  'qwerty123456',
  'administrator',
];
const COMMON = new Set(
  [...MINI_GAMES, ...dictionary['passwords-common']].map((p) => p.toLowerCase()),
);

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/** What is wrong with a new password, or null. */
export function passwordProblem(password: string): PasswordProblem | null {
  if (password.length < PASSWORD_MIN) return 'tooShort';
  if (password.length > PASSWORD_MAX) return 'tooLong';
  if (COMMON.has(password.toLowerCase())) return 'tooCommon';
  return null;
}

export const hashPassword = (password: string): Promise<string> => hash(password, OPTIONS);

/** Whether the password matches; a broken hash is a mismatch, never a throw. */
export async function passwordMatches(stored: string, password: string): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;

/** A hash of a random password, made once, for sign-ins of unknown names. */
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword(randomBytes(16).toString('hex'));
  return dummy;
}
