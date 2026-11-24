/**
 * @file   packages/domain/src/redact.ts
 * @brief  Takes a player's name out of the show events (DECISIONS D61).
 *
 * Responsibility: an event names a person only through an `Actor` (`created.by`,
 *                 `claimed.player`, `started.by`, `handedOver.to`); every other event holds an
 *                 id. `redactPlayer` gives back the event with the name of the actor with this id
 *                 replaced, and the very same object where nothing changes, so a store can tell
 *                 which events to rewrite. The id, the case, the rank, the times and the sealed
 *                 distribution stay as they were: a result and its commitment are unchanged.
 * Depends on:     ./events.js (types)
 */
import type { Actor, ShowEvent } from './events.js';

const renamed = (actor: Actor, playerId: string, name: string): Actor =>
  actor.id === playerId && actor.name !== name ? { ...actor, name } : actor;

/** The event with the name of the player `playerId` replaced by `name`; else the event itself. */
export function redactPlayer(event: ShowEvent, playerId: string, name: string): ShowEvent {
  switch (event.type) {
    case 'created': {
      const by = renamed(event.by, playerId, name);
      return by === event.by ? event : { ...event, by };
    }
    case 'claimed': {
      const player = renamed(event.player, playerId, name);
      return player === event.player ? event : { ...event, player };
    }
    case 'started': {
      const by = renamed(event.by, playerId, name);
      return by === event.by ? event : { ...event, by };
    }
    case 'handedOver': {
      const to = renamed(event.to, playerId, name);
      return to === event.to ? event : { ...event, to };
    }
    default:
      return event;
  }
}
