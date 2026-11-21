/**
 * @file   apps/web/src/lib/base.ts
 * @brief  The client's base path: `/` locally, `/games/cases/` inside the website.
 *
 * Responsibility: one place that turns an app path into a URL under the base path, so nothing
 *                 hard-codes `/api` or `/socket.io` at the root (GAME-INTEGRATION §1). The base
 *                 comes from Vite's `base` (apps/web/vite.config.ts, SC_MODE).
 * Depends on:     vite (import.meta.env.BASE_URL)
 */

// Always ends with "/".
export const BASE = import.meta.env.BASE_URL;

/** An API path ("/shows/current") under the base path ("/games/cases/api/shows/current"). */
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
