/**
 * @file   packages/contracts/src/socket.ts
 * @brief  The socket event names and payloads, both directions.
 *
 * Responsibility: the client watches one show and receives its projection (public, moderator,
 *                 personal); the direction holder sends the reveal steps, each acknowledged at
 *                 once (CONCEPT §8: within 5 seconds).
 * Depends on:     zod, ./view.js
 */
import { z } from 'zod';

import type { ModeratorView, PersonalView, PublicShowView } from './view.js';

export const WatchRequestSchema = z.object({ showId: z.string().min(1) });
export const SelectRequestSchema = z.object({
  showId: z.string().min(1),
  caseNumber: z.number().int().min(1),
});

// The steps after "select", in order, then back to the stage (CONCEPT §3.4).
export const DIRECTION_STEPS = ['tension', 'open', 'prize', 'owner', 'return'] as const;
export const DirectionStepSchema = z.enum(DIRECTION_STEPS);
export type DirectionStep = z.infer<typeof DirectionStepSchema>;
export const StepRequestSchema = z.object({ showId: z.string().min(1), step: DirectionStepSchema });

export const HandOverRequestSchema = z.object({
  showId: z.string().min(1),
  toModeratorId: z.string().min(1),
});
export const EndRequestSchema = z.object({ showId: z.string().min(1) });

export type Ack = { readonly ok: true } | { readonly ok: false; readonly error: string };
export type AckFn = (ack: Ack) => void;

export interface ClientToServerEvents {
  'show:watch': (request: unknown, ack: AckFn) => void;
  'direction:select': (request: unknown, ack: AckFn) => void;
  'direction:step': (request: unknown, ack: AckFn) => void;
  'direction:handOver': (request: unknown, ack: AckFn) => void;
  'direction:end': (request: unknown, ack: AckFn) => void;
}

export interface ServerToClientEvents {
  'show:public': (view: PublicShowView) => void;
  'show:moderator': (view: ModeratorView) => void;
  'show:personal': (view: PersonalView) => void;
}
