/**
 * @file   apps/web/src/lib/mode.ts
 * @brief  The server's mode as the client needs it: local or website, development, a chat to
 *         frame.
 *
 * Responsibility: one question to `api/config` at start. Website mode brings the back link, the
 *                 website's sign-in and the docked chat (GAME-INTEGRATION §2, §5, §8); local mode
 *                 has the development sign-in when the server is in development, and the docked
 *                 chat only when the server names a chat origin (SC_CHAT_ORIGIN, development).
 * Depends on:     react, ./api.js, ./base.js
 */
import { useEffect, useState } from 'react';

import { getJson } from './api.js';
import { apiPath } from './base.js';

export interface ServerMode {
  readonly mode: 'local' | 'website';
  readonly dev: boolean;
  readonly chatOrigin: string | null;
  // The privacy page's contact line; empty: the page says "the operator of this site".
  readonly privacyContact: string;
}

const UNKNOWN: ServerMode = { mode: 'local', dev: false, chatOrigin: null, privacyContact: '' };

/** The mode; local without development features until the server has answered. */
export function useServerMode(): ServerMode {
  const [mode, setMode] = useState<ServerMode>(UNKNOWN);
  useEffect(() => {
    getJson<ServerMode>(apiPath('/config'))
      .then(setMode)
      .catch(() => undefined);
  }, []);
  return mode;
}

/** Whether the screens sit in the docked chat. */
export const docked = (mode: ServerMode): boolean =>
  mode.mode === 'website' || mode.chatOrigin !== null;
