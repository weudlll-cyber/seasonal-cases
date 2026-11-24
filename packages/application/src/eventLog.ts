/**
 * @file   packages/application/src/eventLog.ts
 * @brief  The event stores: in memory, and append-only JSON lines per show on disk.
 *
 * Responsibility: `memoryStore` keeps the events of a test or of a run without files.
 *                 `jsonlStore(dir)` writes one JSON line per event to `<dir>/<showId>.jsonl`
 *                 and reads every file back on start, so a show is rebuilt from its lines
 *                 (DECISIONS D17; with a database the server uses apps/server/src/db, D26).
 *                 Lines are only ever appended, but for `redact`: a player's deletion takes their
 *                 name out of the logs (D61), through `redactLogs`, which the database store uses
 *                 as well.
 * Depends on:     node:fs, node:path, @sc/domain, ./ports.js
 */
import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { redactPlayer, type ShowEvent } from '@sc/domain';

import type { EventStore } from './ports.js';

/**
 * The logs with the player's name replaced: only the shows whose log changed, each with its new
 * events (the same event objects where nothing changed).
 */
export function redactLogs(
  shows: ReadonlyMap<string, readonly ShowEvent[]>,
  playerId: string,
  name: string,
): Map<string, ShowEvent[]> {
  const changed = new Map<string, ShowEvent[]>();
  for (const [showId, events] of shows) {
    const next = events.map((e) => redactPlayer(e, playerId, name));
    if (next.some((e, i) => e !== events[i])) changed.set(showId, next);
  }
  return changed;
}

/** A store that keeps everything in memory. */
export function memoryStore(): EventStore {
  const shows = new Map<string, ShowEvent[]>();
  return {
    append(showId, events) {
      shows.set(showId, [...(shows.get(showId) ?? []), ...events]);
    },
    loadAll: () => shows,
    redact(playerId, name) {
      const changed = redactLogs(shows, playerId, name);
      for (const [showId, events] of changed) shows.set(showId, events);
      return [...changed.keys()];
    },
  };
}

// A show id becomes a file name; only these characters are allowed in it.
const SAFE_ID = /^[A-Za-z0-9_-]+$/;
const EXTENSION = '.jsonl';

/** A store of append-only JSON-lines files, one per show, under `dir`. */
export function jsonlStore(dir: string): EventStore {
  mkdirSync(dir, { recursive: true });
  const load = (): Map<string, ShowEvent[]> => {
    const shows = new Map<string, ShowEvent[]>();
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith(EXTENSION))
      .sort()) {
      const text = readFileSync(join(dir, file), 'utf8');
      const events = text
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => JSON.parse(line) as ShowEvent);
      shows.set(file.slice(0, -EXTENSION.length), events);
    }
    return shows;
  };
  return {
    append(showId, events) {
      if (!SAFE_ID.test(showId)) throw new Error(`unsafe show id ${showId}`);
      const lines = events.map((e) => `${JSON.stringify(e)}\n`).join('');
      appendFileSync(join(dir, `${showId}${EXTENSION}`), lines, 'utf8');
    },
    loadAll: load,
    redact(playerId, name) {
      const changed = redactLogs(load(), playerId, name);
      for (const [showId, events] of changed) {
        const lines = events.map((e) => `${JSON.stringify(e)}\n`).join('');
        writeFileSync(join(dir, `${showId}${EXTENSION}`), lines, 'utf8');
      }
      return [...changed.keys()];
    },
  };
}
