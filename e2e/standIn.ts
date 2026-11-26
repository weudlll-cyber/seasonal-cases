/**
 * @file   e2e/standIn.ts
 * @brief  The website-mode browser tests' website: the kit's stand-in in front of this game.
 *
 * Responsibility: start `startWebsiteStandIn` (the website and its proxy on a free port, K74) with
 *                 the game `cases` switched on: its app is the website-mode Vite client, whose
 *                 proxy hands the API, the socket and the sign-in on to the website-mode game
 *                 server (./playwright.config.ts starts both). The test that starts it closes it,
 *                 and chooses who signs in with `signInAs`.
 * Depends on:     @seasonal/kit/testing, ./stubShared.ts
 */
import { startWebsiteStandIn, type WebsiteStandIn } from '@seasonal/kit/testing';

import { APP_ORIGIN, MEMBERS, STUB_PROXY_SECRET } from './stubShared.js';

export type { WebsiteStandIn };

export function startSite(): Promise<WebsiteStandIn> {
  return startWebsiteStandIn({
    games: {
      cases: { app: APP_ORIGIN, secretHeader: 'X-Sc-Proxy-Secret', secret: STUB_PROXY_SECRET },
    },
    members: MEMBERS,
  });
}

/** The game's start page on the stand-in. */
export const gameAt = (site: WebsiteStandIn): string => `${site.origin}/games/cases/`;
