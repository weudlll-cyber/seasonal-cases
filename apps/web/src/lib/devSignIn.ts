/**
 * @file   apps/web/src/lib/devSignIn.ts
 * @brief  The development sign-in's request, present in a development build only (D63).
 *
 * Responsibility: `devSignInOf` answers the function that signs a test identity in through the
 *                 server's development sign-in (no password, refused outside development), or
 *                 `undefined` in a production build. The path is written inside the build-time
 *                 branch, so Vite replaces `import.meta.env.DEV` with `false` and a production
 *                 bundle has neither the function nor the path. No runtime check stands in for
 *                 this: the server refuses the route anyway, the bundle must not offer it.
 * Depends on:     @sc/contracts (types), ./api.js, ./base.js
 */
import type { Me, SignInRequest } from '@sc/contracts';

import { postJson } from './api.js';
import { apiPath } from './base.js';

export type DevSignInFn = (request: SignInRequest) => Promise<void>;

export function devSignInOf(enter: (me: Me) => void): DevSignInFn | undefined {
  if (!import.meta.env.DEV) return undefined;
  return async (request) => {
    enter(await postJson<Me>(apiPath('/dev/sign-in'), request));
  };
}
