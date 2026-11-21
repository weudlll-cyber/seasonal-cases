/**
 * @file   apps/web/src/lib/router.tsx
 * @brief  The client's routes on the History API, under the base path (./base.ts).
 *
 * Responsibility: the current app path (without the base path) as React state, `navigate` for
 *                 in-app moves, and `Link` for anchors that move without a reload. Routes are
 *                 written as app paths (`/show`); the base path is added here. No router
 *                 library: a handful of routes does not need one.
 * Depends on:     react, ./base.js
 */
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';

import { appPathOf, pagePath } from './base.js';

const MOVED = 'sc:navigate';

/** Moves to an app path ("/show") without a reload. */
export function navigate(path: string): void {
  window.history.pushState(null, '', pagePath(path));
  window.dispatchEvent(new Event(MOVED));
}

/** The app path of the page, following back/forward and `navigate`. */
export function usePath(): string {
  const [path, setPath] = useState(() => appPathOf(window.location.pathname));
  useEffect(() => {
    const update = () => {
      setPath(appPathOf(window.location.pathname));
    };
    window.addEventListener('popstate', update);
    window.addEventListener(MOVED, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(MOVED, update);
    };
  }, []);
  return path;
}

export type Route =
  | { readonly name: 'start' }
  | { readonly name: 'stage' }
  | { readonly name: 'results'; readonly showId: string }
  | { readonly name: 'admin' }
  | { readonly name: 'matches' }
  | { readonly name: 'reset' };

export function routeOf(path: string): Route {
  if (path === '/show') return { name: 'stage' };
  if (path === '/admin') return { name: 'admin' };
  if (path === '/matches') return { name: 'matches' };
  if (path === '/reset') return { name: 'reset' };
  const results = /^\/results\/([A-Za-z0-9_-]+)$/.exec(path);
  if (results?.[1] !== undefined) return { name: 'results', showId: results[1] };
  return { name: 'start' };
}

export function Link({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={pagePath(to)} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
