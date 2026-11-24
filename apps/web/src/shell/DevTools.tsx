/**
 * @file   apps/web/src/shell/DevTools.tsx
 * @brief  Development-only parts of the header: the "Dev sign-in" menu and the Quick Test link.
 *
 * Responsibility: the kit's `DevSignIn` (a compact menu, one click per test identity) with this
 *                 game's identities: an organiser, an admin and three players of different
 *                 ranks, each signing in through the development sign-in (`POST
 *                 /api/dev/sign-in`, no password, refused outside development); and the link to
 *                 the admin area, where the Quick Test button (a live show with bots) lives.
 *                 Loaded on demand by ./ShellBar only when Vite's DEV flag is set, so a
 *                 production bundle contains neither these parts nor the kit's `DevSignIn`.
 *                 The start page's own form (name, role, rank) stays for any other identity.
 * Depends on:     react (types), @seasonal/kit/react/dev, @sc/contracts (types), ../lib/base.js
 */
import { DevSignIn as KitDevSignIn } from '@seasonal/kit/react/dev';
import type { SignInRequest } from '@sc/contracts';
import type { ReactElement } from 'react';

import { pagePath } from '../lib/base.js';

const IDENTITIES: readonly { as: string; label: string; request: SignInRequest }[] = [
  {
    as: 'organiser',
    label: 'Sign in as organiser',
    request: { name: 'Olga', role: 'organiser', rank: 0 },
  },
  { as: 'admin', label: 'Sign in as admin', request: { name: 'Ada', role: 'admin', rank: 0 } },
  {
    as: 'player-1',
    label: 'Sign in as player 1',
    request: { name: 'Ana', role: 'player', rank: 0 },
  },
  {
    as: 'player-2',
    label: 'Sign in as player 2',
    request: { name: 'Ben', role: 'player', rank: 2 },
  },
  {
    as: 'player-3',
    label: 'Sign in as player 3',
    request: { name: 'Cleo', role: 'player', rank: 5 },
  },
];

export const QUICK_TEST_PATH = '/admin';

/** After the header's links: the way to the Quick Test. */
export function QuickTestLink(): ReactElement {
  return <a href={pagePath(QUICK_TEST_PATH)}>Quick Test</a>;
}

/** One compact menu instead of five buttons in the bar: the kit's, with this game's identities. */
export function DevSignIn({
  onSignIn,
}: {
  onSignIn: (request: SignInRequest) => Promise<void>;
}): ReactElement {
  return (
    <KitDevSignIn
      identities={IDENTITIES}
      onSignIn={async (as) => {
        const found = IDENTITIES.find((identity) => identity.as === as);
        if (found !== undefined) await onSignIn(found.request);
      }}
      buttonClassName="button"
    />
  );
}
