/**
 * @file   apps/web/src/lib/session.ts
 * @brief  The signed-in user as React state: read from api/me, changed by sign-in and out.
 *
 * Responsibility: one hook for the whole page; `undefined` while loading, `null` when nobody
 *                 is signed in (a guest watches, CONCEPT §2). `enter` takes the user a
 *                 standalone sign-in or registration answered with (../account/AccountEntry.tsx),
 *                 or a development sign-in (./devSignIn.ts, development builds only).
 * Depends on:     react, @sc/contracts (types), ./base.js
 */
import type { Me } from '@sc/contracts';
import { useCallback, useEffect, useState } from 'react';

import { api, post } from './base.js';

export interface Session {
  readonly me: Me | null | undefined;
  readonly enter: (me: Me) => void;
  readonly signOut: () => Promise<void>;
}

export function useSession(): Session {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    api<{ me: Me | null }>('/me')
      .then((answer) => {
        setMe(answer.me);
      })
      .catch(() => {
        setMe(null);
      });
  }, []);
  const signOut = useCallback(async () => {
    await post('/sign-out');
    setMe(null);
  }, []);
  return { me, enter: setMe, signOut };
}
