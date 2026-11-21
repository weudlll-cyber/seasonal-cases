/**
 * @file   packages/application/src/eventLog.ts
 * @brief  The event stores: in memory, and append-only JSON lines per show on disk.
 *
 * Responsibility: `memoryStore` keeps the events of a test or of a run without files.
 *                 `jsonlStore(dir)` writes one JSON line per event to `<dir>/<showId>.jsonl`
 *                 and reads every file back on start, so a show is rebuilt from its lines
 *                 (DECISIONS D17; with a database the server uses apps/server/src/db, D26).
 *                 Lines are only ever appended.
 * Depends on:     node:fs, node:path, @sc/domain (types), ./ports.js
 */
import { appendFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ShowEvent } from '@sc/domain';

import type { EventStore } from './ports.js';

/** A store that keeps everything in memory. */
export function memoryStore(): EventStore {
  const shows = new Map<string, ShowEvent[]>();
  return {
    append(showId, events) {
      shows.set(showId, [...(shows.get(showId) ?? []), ...events]);
    },
    loadAll: () => shows,
  };
}

// A show id becomes a file name; only these characters are allowed in it.
const SAFE_ID = /^[A-Za-z0-9_-]+$/;
const EXTENSION = '.jsonl';

/** A store of append-only JSON-lines files, one per show, under `dir`. */
export function jsonlStore(dir: string): EventStore {
  mkdirSync(dir, { recursive: true });
  return {
    append(showId, events) {
      if (!SAFE_ID.test(showId)) throw new Error(`unsafe show id ${showId}`);
      const lines = events.map((e) => `${JSON.stringify(e)}\n`).join('');
      appendFileSync(join(dir, `${showId}${EXTENSION}`), lines, 'utf8');
    },
    loadAll() {
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
    },
  };
}
