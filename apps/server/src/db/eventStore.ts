/**
 * @file   apps/server/src/db/eventStore.ts
 * @brief  The shows' event log in PostgreSQL behind the synchronous EventStore port.
 *
 * Responsibility: `pgEventStore` reads every show's events once (the rebuild on start, CONCEPT §8)
 *                 and then appends each new event as a row, in order, through one write queue, so
 *                 the show service never waits on the database. A sealed event's assignment and
 *                 secret are stored as one encrypted box bound to the show (./box.ts,
 *                 SC_DATA_KEY); only the commitment stays readable, as the screens already show it. A failed write is
 *                 reported through `onError` and the queue goes on; `flush` waits for every
 *                 pending write (shutdown, tests). `redact` rewrites the rows of the events that
 *                 named a deleted player (D61), the one time an earlier row is changed.
 * Depends on:     @sc/application, @sc/domain (types), ./box.js, ./pool.js
 */
import { redactLogs, type EventStore } from '@sc/application';
import type { ShowEvent } from '@sc/domain';

import { open, seal } from './box.js';
import type { DbPool } from './pool.js';

export interface PgEventStore extends EventStore {
  /** Resolves once every append so far is written. */
  flush(): Promise<void>;
}

type Stored = Record<string, unknown>;

// What goes into the row: a sealed event without its assignment and secret in the clear.
function toRow(key: Buffer, showId: string, event: ShowEvent): Stored {
  if (event.type !== 'sealed') return { ...event };
  const { assignment, secret, ...rest } = event;
  return { ...rest, box: seal(key, JSON.stringify({ assignment, secret }), `show:${showId}`) };
}

function fromRow(key: Buffer, showId: string, row: Stored): ShowEvent {
  if (row.type !== 'sealed') return row as unknown as ShowEvent;
  const { box, ...rest } = row;
  if (typeof box !== 'string') throw new Error('a sealed event without its box');
  const hidden = JSON.parse(open(key, box, `show:${showId}`)) as Pick<
    Extract<ShowEvent, { type: 'sealed' }>,
    'assignment' | 'secret'
  >;
  return { ...rest, ...hidden } as unknown as ShowEvent;
}

async function loadEvents(pool: DbPool, key: Buffer): Promise<Map<string, ShowEvent[]>> {
  const result = await pool.query<{ show_id: string; event: Stored }>(
    'SELECT show_id, event FROM show_events ORDER BY show_id, seq',
  );
  const shows = new Map<string, ShowEvent[]>();
  for (const row of result.rows) {
    const list = shows.get(row.show_id) ?? [];
    list.push(fromRow(key, row.show_id, row.event));
    shows.set(row.show_id, list);
  }
  return shows;
}

/** The event log in the database: loaded now, written behind. */
export async function pgEventStore(
  pool: DbPool,
  key: Buffer,
  onError: (error: unknown) => void,
): Promise<PgEventStore> {
  const shows = await loadEvents(pool, key);
  // The next sequence number per show; rows are only ever added.
  const next = new Map([...shows].map(([id, events]) => [id, events.length]));
  let queue: Promise<void> = Promise.resolve();
  return {
    append(showId, events) {
      const first = next.get(showId) ?? 0;
      next.set(showId, first + events.length);
      // The copy in memory follows the rows, so `redact` reaches this run's events too.
      shows.set(showId, [...(shows.get(showId) ?? []), ...events]);
      const rows = events.map((e) => JSON.stringify(toRow(key, showId, e)));
      queue = queue
        .then(async () => {
          for (const [i, row] of rows.entries()) {
            await pool.query('INSERT INTO show_events (show_id, seq, event) VALUES ($1, $2, $3)', [
              showId,
              first + i,
              row,
            ]);
          }
        })
        .catch(onError);
    },
    loadAll: () => shows,
    redact(playerId, name) {
      // The memory is the log the service reads; the rows that differ are rewritten behind it.
      const changed = redactLogs(shows, playerId, name);
      for (const [showId, events] of changed) {
        const before = shows.get(showId) ?? [];
        shows.set(showId, events);
        queue = queue
          .then(async () => {
            for (const [seq, event] of events.entries()) {
              if (event === before[seq]) continue;
              await pool.query(
                'UPDATE show_events SET event = $1 WHERE show_id = $2 AND seq = $3',
                [JSON.stringify(toRow(key, showId, event)), showId, seq],
              );
            }
          })
          .catch(onError);
      }
      return [...changed.keys()];
    },
    flush: () => queue,
  };
}
