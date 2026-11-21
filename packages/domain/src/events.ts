/**
 * @file   packages/domain/src/events.ts
 * @brief  The show's events: the append-only facts every state is a fold over.
 *
 * Responsibility: one type per thing that happened to a show (CONCEPT §3, §8: the event log is
 *                 append-only and reproducible). Each event carries its ISO time `at` from the
 *                 injected clock; the actor `by` is a user id. The sealing event holds the
 *                 assignment and the secret: it stays on the server, and no projection reads
 *                 either before the show has ended.
 * Depends on:     @sc/contracts (types)
 */
import type { Artifact, AssignmentEntry, DirectionStep, PrizeSlot, Rank } from '@sc/contracts';

export interface Actor {
  readonly id: string;
  readonly name: string;
}

export type ShowEvent =
  | {
      readonly type: 'created';
      readonly at: string;
      readonly showId: string;
      readonly by: Actor;
      readonly caseCount: number;
      readonly prizeSlots: readonly PrizeSlot[];
      readonly prizes: readonly Artifact[];
      readonly blank: Artifact;
    }
  | { readonly type: 'registrationOpened'; readonly at: string; readonly by: string }
  | {
      readonly type: 'claimed';
      readonly at: string;
      readonly player: Actor;
      readonly rank: Rank;
      readonly caseNumber: number;
    }
  | { readonly type: 'registrationClosed'; readonly at: string; readonly by: string }
  | {
      readonly type: 'sealed';
      readonly at: string;
      readonly by: string;
      readonly commitment: string;
      readonly assignment: readonly AssignmentEntry[];
      readonly secret: string;
    }
  | { readonly type: 'started'; readonly at: string; readonly by: Actor }
  | {
      readonly type: 'selected';
      readonly at: string;
      readonly by: string;
      readonly caseNumber: number;
    }
  | {
      readonly type: 'stepped';
      readonly at: string;
      readonly by: string;
      readonly step: DirectionStep;
    }
  | { readonly type: 'handedOver'; readonly at: string; readonly by: string; readonly to: Actor }
  | { readonly type: 'ended'; readonly at: string; readonly by: string };

export type ShowEventType = ShowEvent['type'];
