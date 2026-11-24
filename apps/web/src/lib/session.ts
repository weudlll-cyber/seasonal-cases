/**
 * @file   apps/web/src/lib/session.ts
 * @brief  The signed-in user as React state: read from api/me, changed by sign-in and out.
 *
 * Responsibility: one hook for the whole page; `undefined` while loading, `null` when nobody
 *                 is signed in (a guest watches, CONCEPT §2). `enter` takes the user a
 *                 standalone sign-in or registration answered with (../account/AccountEntry.tsx),
 *                 or a development sign-in (./devSignIn.ts, development builds only).
 * Depends on:     react, @sc/contracts (types), ./api.js, ./base.js
 */
import type { Me } from '@sc/contracts';
import { useCallback, useEffect, useState } from 'react';

import { getJson, postJson } from './api.js';
import { apiPath } from './base.js';

export interface Session {
  readonly me: Me | null | undefined;
  readonly enter: (me: Me) => void;
  readonly signOut: () => Promise<void>;
}

export function useSession(): Session {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    getJson<{ me: Me | null }>(apiPath('/me'))
      .then((answer) => {
        setMe(answer.me);
      })
      .catch(() => {
        setMe(null);
      });
  }, []);
  const signOut = useCallback(async () => {
    await postJson(apiPath('/sign-out'));
    setMe(null);
  }, []);
  return { me, enter: setMe, signOut };
}
