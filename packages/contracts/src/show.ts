/**
 * @file   packages/contracts/src/show.ts
 * @brief  The show's life states as a zod schema and its type (CONCEPT §3).
 *
 * Responsibility: the one list of show states every layer and the client share.
 * Depends on:     zod
 */
import { z } from 'zod';

// SETUP → REGISTRATION → SEALED → LIVE → ENDED (CONCEPT §3).
export const SHOW_STATES = ['setup', 'registration', 'sealed', 'live', 'ended'] as const;
export const ShowStateSchema = z.enum(SHOW_STATES);
export type ShowState = z.infer<typeof ShowStateSchema>;
