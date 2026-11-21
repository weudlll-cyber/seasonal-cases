/**
 * @file   apps/web/src/lib/router.tsx
 * @brief  The client's four routes on the History API: `/`, `/show`, `/results/<id>`, `/admin`.
 *
 * Responsibility: the current path as React state, `navigate` for in-app moves, and `Link` for
 *                 anchors that move without a reload. No router library: four routes do not
 *                 need one.
 * Depends on:     react
 */
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';

const MOVED = 'sc:navigate';

export function navigate(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new Event(MOVED));
}

/** The path of the page, following back/forward and `navigate`. */
export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const update = () => {
      setPath(window.location.pathname);
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
  | { readonly name: 'lobby' }
  | { readonly name: 'stage' }
  | { readonly name: 'results'; readonly showId: string }
  | { readonly name: 'admin' };

export function routeOf(path: string): Route {
  if (path === '/show') return { name: 'stage' };
  if (path === '/admin') return { name: 'admin' };
  const results = /^\/results\/([A-Za-z0-9_-]+)$/.exec(path);
  if (results?.[1] !== undefined) return { name: 'results', showId: results[1] };
  return { name: 'lobby' };
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
    <a href={to} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
