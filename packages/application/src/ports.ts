/**
 * @file   packages/application/src/ports.ts
 * @brief  What the use cases need from outside: clock, ids, randomness and the event store.
 *
 * Responsibility: the seams the server fills with real implementations and the tests with
 *                 fakes. The domain stays pure; these ports carry the time, the ids and the
 *                 random sources into it.
 * Depends on:     @sc/domain (types)
 */
import type { RandomPort, ShowEvent } from '@sc/domain';

export interface Clock {
  /** Now as an ISO time. */
  now(): string;
}

export interface IdSource {
  /** A new show id, unique on this server. */
  showId(): string;
}

export interface RandomSource {
  /** The secure source of production (CONCEPT §8). */
  secure(): RandomPort;
  /** The deterministic source of test mode, from a Quick Test seed. */
  seeded(seed: string): RandomPort;
}

export interface EventStore {
  /** Appends the events to the show's log; never rewrites earlier ones. */
  append(showId: string, events: readonly ShowEvent[]): void;
  /** Every show's events, for the rebuild on start. */
  loadAll(): ReadonlyMap<string, readonly ShowEvent[]>;
  /**
   * Takes the name of the player with this id out of every stored event, replacing it by `name`,
   * and answers the ids of the shows whose log changed. The one exception to "never rewrites
   * earlier ones": a player who deletes their account leaves no name behind (DECISIONS D61).
   */
  redact(playerId: string, name: string): readonly string[];
}
