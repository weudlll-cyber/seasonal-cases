/**
 * @file   apps/server/src/applause.ts
 * @brief  The applause of a live show: counted per show, sent to its watchers twice a second at
 *         most (CONCEPT §12 P3, DECISIONS D39).
 *
 * Responsibility: `show:applaud` from a socket that watches the show, while the show is live,
 *                 at most 5 a second per socket (the kit's RateLimiter); each counts once. Per
 *                 show the total and the applause of the last 10 s; a `show:applause` with both
 *                 goes to the show's watchers no sooner than 500 ms after the last one (the first
 *                 at once), so a crowd's clapping costs two messages a second. Applause lives in
 *                 memory only: it is not an event of the show and changes nothing of its state
 *                 or outcome (CONCEPT §1); a restart starts it at 0.
 * Depends on:     @seasonal/kit/server, @sc/contracts
 */
import { RateLimiter } from '@seasonal/kit/server';
import { ShowRequestSchema, type Ack, type Applause } from '@sc/contracts';

export const APPLAUSE_PER_SECOND = 5;
export const APPLAUSE_EVERY_MS = 500;
export const APPLAUSE_RECENT_MS = 10_000;

interface Tally {
  total: number;
  // The times of the applause within the last APPLAUSE_RECENT_MS, oldest first.
  readonly times: number[];
  lastSent: number;
  timer: ReturnType<typeof setTimeout> | null;
}

export interface ApplauseDeps {
  /** Whether the show exists and is live. */
  readonly isLive: (showId: string) => boolean;
  /** Whether this socket watches this show. */
  readonly watches: (socketId: string, showId: string) => boolean;
  /** Sends the applause to everyone watching the show. */
  readonly broadcast: (applause: Applause) => void;
  readonly now: () => number;
}

export interface ApplauseCounter {
  /** Takes one applause from a socket; answers the ack. */
  readonly applaud: (socketId: string, request: unknown) => Ack;
  /** Stops the pending sends (server shutdown, tests). */
  readonly stop: () => void;
}

export function applauseCounter(deps: ApplauseDeps): ApplauseCounter {
  const tallies = new Map<string, Tally>();
  const perSocket = new RateLimiter({ limit: APPLAUSE_PER_SECOND, windowMs: 1000 });

  const snapshot = (showId: string, tally: Tally): Applause => {
    const since = deps.now() - APPLAUSE_RECENT_MS;
    while ((tally.times[0] ?? Infinity) < since) tally.times.shift();
    return { showId, total: tally.total, recent: tally.times.length };
  };

  const send = (showId: string, tally: Tally): void => {
    tally.timer = null;
    tally.lastSent = deps.now();
    deps.broadcast(snapshot(showId, tally));
  };

  // At once when the last send is old enough, otherwise once at the end of the 500 ms.
  const schedule = (showId: string, tally: Tally): void => {
    if (tally.timer !== null) return;
    const wait = tally.lastSent + APPLAUSE_EVERY_MS - deps.now();
    if (wait <= 0) send(showId, tally);
    else {
      tally.timer = setTimeout(() => {
        send(showId, tally);
      }, wait);
    }
  };

  const applaud = (socketId: string, request: unknown): Ack => {
    const parsed = ShowRequestSchema.safeParse(request);
    if (!parsed.success) return { ok: false, error: 'which show?' };
    const { showId } = parsed.data;
    if (!deps.isLive(showId)) return { ok: false, error: 'the show is not live' };
    if (!deps.watches(socketId, showId)) return { ok: false, error: 'watch the show first' };
    if (!perSocket.take(socketId).allowed) return { ok: false, error: 'not so fast' };
    const tally = tallies.get(showId) ?? { total: 0, times: [], lastSent: -Infinity, timer: null };
    tallies.set(showId, tally);
    tally.total += 1;
    tally.times.push(deps.now());
    schedule(showId, tally);
    return { ok: true };
  };

  const stop = (): void => {
    for (const tally of tallies.values()) if (tally.timer !== null) clearTimeout(tally.timer);
  };

  return { applaud, stop };
}
