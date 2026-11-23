/**
 * @file   packages/contracts/src/socket.ts
 * @brief  The socket event names and payloads, both directions.
 *
 * Responsibility: the client watches one show and receives its projection (public, organiser,
 *                 personal); the direction holder sends the reveal steps, each acknowledged at
 *                 once (CONCEPT §8: within 5 seconds); anyone watching a live show may applaud,
 *                 and the watchers receive the applause count.
 * Depends on:     zod, ./view.js
 */
import { z } from 'zod';

import type { OrganiserView, PersonalView, PublicShowView } from './view.js';

/** A live show's applause: the total and the last 10 s (CONCEPT §12 P3, DECISIONS D39). */
export interface Applause {
  readonly showId: string;
  readonly total: number;
  readonly recent: number;
}

export const WatchRequestSchema = z.object({ showId: z.string().min(1) });
export const SelectRequestSchema = z.object({
  showId: z.string().min(1),
  caseNumber: z.number().int().min(1),
});

// The organiser's steps after the click on a case, in order, then back to the stage
// (CONCEPT §3.4, v1.1).
export const DIRECTION_STEPS = ['open', 'owner', 'return'] as const;
export const DirectionStepSchema = z.enum(DIRECTION_STEPS);
export type DirectionStep = z.infer<typeof DirectionStepSchema>;
export const StepRequestSchema = z.object({ showId: z.string().min(1), step: DirectionStepSchema });

export const HandOverRequestSchema = z.object({
  showId: z.string().min(1),
  toOrganiserId: z.string().min(1),
});
// Begin and End name only the show.
export const ShowRequestSchema = z.object({ showId: z.string().min(1) });

export type Ack = { readonly ok: true } | { readonly ok: false; readonly error: string };
export type AckFn = (ack: Ack) => void;

export interface ClientToServerEvents {
  'show:watch': (request: unknown, ack: AckFn) => void;
  'direction:begin': (request: unknown, ack: AckFn) => void;
  'direction:select': (request: unknown, ack: AckFn) => void;
  'direction:step': (request: unknown, ack: AckFn) => void;
  'direction:handOver': (request: unknown, ack: AckFn) => void;
  'direction:end': (request: unknown, ack: AckFn) => void;
  // Anyone watching a live show; it changes nothing of the show (CONCEPT §1).
  'show:applaud': (request: unknown, ack: AckFn) => void;
}

export interface ServerToClientEvents {
  'show:public': (view: PublicShowView) => void;
  'show:organiser': (view: OrganiserView) => void;
  'show:personal': (view: PersonalView) => void;
  'show:applause': (applause: Applause) => void;
}
