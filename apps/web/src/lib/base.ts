/**
 * @file   apps/web/src/lib/base.ts
 * @brief  The client's base path (`/` locally, `/games/cases/` inside the website) and the
 *         calls to the server under it.
 *
 * Responsibility: one place that turns an app path into a URL under the base path, so nothing
 *                 hard-codes `/api` or `/socket.io` at the root (GAME-INTEGRATION §1). The base
 *                 comes from Vite's `base` (apps/web/vite.config.ts, SC_MODE). `api` is the
 *                 kit's client under `<base>api`; a refusal is its `ApiError`, whose sentence
 *                 ./useAction.ts reads.
 * Depends on:     @seasonal/kit, vite (import.meta.env.BASE_URL)
 */
import { createApiClient } from '@seasonal/kit';

// Always ends with "/".
export const BASE = import.meta.env.BASE_URL;

// The base is named: a page's own folder is not the client's on a nested route.
export const api = createApiClient({ basePath: BASE, prefix: 'api' });

/** A POST with a JSON body (`{}` without one, as the server's routes expect). */
export const post = <T>(path: string, body: unknown = {}): Promise<T> =>
  api<T>(path, { method: 'POST', body });

/** An API path as a URL, for what the browser opens itself (the data export's form). */
export function apiPath(path: string): string {
  return `${BASE}api${path}`;
}

/** An app page ("/show") under the base path. */
export function pagePath(path: string): string {
  return `${BASE}${path.replace(/^\//, '')}`;
}

/** The app page of the current location, without the base path ("/show"). */
export function appPathOf(pathname: string): string {
  return pathname.startsWith(BASE) ? `/${pathname.slice(BASE.length)}` : pathname;
}

// socket.io's path under the base path, as the server serves it (apps/server/src/app.ts).
export const SOCKET_PATH = `${BASE}socket.io`;
