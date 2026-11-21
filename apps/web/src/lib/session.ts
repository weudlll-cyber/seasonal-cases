/**
 * @file   apps/web/src/lib/session.ts
 * @brief  The signed-in user as React state: read from /api/me, changed by sign-in and out.
 *
 * Responsibility: one hook for the whole page; `undefined` while loading, `null` when nobody
 *                 is signed in (a guest watches, CONCEPT §2).
 * Depends on:     react, @sc/contracts (types), ./api.js
 */
import type { Me, SignInRequest } from '@sc/contracts';
import { useCallback, useEffect, useState } from 'react';

import { getJson, postJson } from './api.js';

export interface Session {
  readonly me: Me | null | undefined;
  readonly signIn: (request: SignInRequest) => Promise<void>;
  readonly signOut: () => Promise<void>;
}

export function useSession(): Session {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    getJson<{ me: Me | null }>('/api/me')
      .then((answer) => {
        setMe(answer.me);
      })
      .catch(() => {
        setMe(null);
      });
  }, []);
  const signIn = useCallback(async (request: SignInRequest) => {
    setMe(await postJson<Me>('/api/dev/sign-in', request));
  }, []);
  const signOut = useCallback(async () => {
    await postJson('/api/dev/sign-out');
    setMe(null);
  }, []);
  return { me, signIn, signOut };
}
