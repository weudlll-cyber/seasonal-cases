/**
 * @file   apps/server/src/seasonSource.ts
 * @brief  The season a new show is created in: the website's season feed in website mode, the
 *         date's season otherwise (DECISIONS D62).
 *
 * Responsibility: in website mode the kit's `seasonFeedReader` reads the website's public season
 *                 (`GET /api/public/season`) server to server, through the kit's guarded fetch
 *                 (`guardedFetch`, only the website's host, public addresses only; D69) and with the
 *                 kit's defaults for the timeout and for how long an answer counts as fresh. The reader runs once at start and then every ten
 *                 minutes. While the feed has not answered, or its last answer is stale, the
 *                 season is the date's (CONCEPT §6), so a website that is down changes nothing.
 *                 Standalone, and a website origin that is not https (development), always the
 *                 date's: the kit's reader reads https only.
 * Depends on:     @seasonal/kit/server, @sc/application, @sc/contracts (types), ./config.js
 */
import { guardedFetch, seasonFeedReader } from '@seasonal/kit/server';
import { seasonOf } from '@sc/application';
import type { Season } from '@sc/contracts';

import type { WebsiteConfig } from './config.js';

const REFRESH_MS = 10 * 60_000;

export interface SeasonSource {
  /** The season of a show created at this ISO time. */
  readonly seasonAt: (at: string) => Season;
  readonly stop: () => void;
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

const DATES: SeasonSource = { seasonAt: seasonOf, stop: () => undefined };

export function seasonSource(
  website: WebsiteConfig | null,
  log: (e: unknown) => void,
  // Replaced by the tests.
  fetcher: Fetcher | null = null,
): SeasonSource {
  if (website === null || !website.origin.startsWith('https://')) return DATES;
  const reader = seasonFeedReader({
    origin: website.origin,
    fetch: fetcher ?? guardedFetch({ allowedHosts: [new URL(website.origin).hostname] }),
  });
  const refresh = () => {
    // The reader never throws: it keeps its last answer and says why a read failed.
    reader
      .refresh()
      .then(({ lastError }) => {
        if (lastError !== null) log(new Error(`season feed: ${lastError}`));
      })
      .catch(log);
  };
  refresh();
  const timer = setInterval(refresh, REFRESH_MS);
  // A pending timer must not keep the process alive on its own.
  timer.unref();
  return {
    seasonAt(at) {
      const { feed, stale } = reader.state();
      return feed === null || stale ? seasonOf(at) : feed.inSeason.season;
    },
    stop: () => {
      clearInterval(timer);
    },
  };
}
