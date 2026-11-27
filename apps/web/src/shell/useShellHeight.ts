/**
 * @file   apps/web/src/shell/useShellHeight.ts
 * @brief  Publishes the kit header's measured height as `--shell-height` on <html>.
 *
 * Responsibility: the header's height depends on the width and on whether the kit folded it into
 *                 its "Menu" (D58); the screens a screen high (the stage, the board) subtract
 *                 `--shell-height`, and this keeps that number true. The hook takes the
 *                 wrapper ./ShellBar.tsx puts around the kit's `AppHeader` and measures the
 *                 `.sk-header` in it (the wrapper itself has no box). A missing header measures
 *                 0: the property is removed then, and the CSS values apply (./shell.css,
 *                 ../stage/moments.css). Without ResizeObserver nothing is published and the CSS
 *                 values stand.
 * Depends on:     react
 */
import { useEffect, type RefObject } from 'react';

const VAR = '--shell-height';

export function useShellHeight(wrapper: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = wrapper.current?.querySelector<HTMLElement>('.sk-header') ?? null;
    if (el === null || typeof ResizeObserver !== 'function') return undefined;
    const root = document.documentElement;
    let frame = 0;
    const publish = (): void => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height > 0) root.style.setProperty(VAR, `${String(height)}px`);
      else root.style.removeProperty(VAR);
    };
    // On the next frame, not inside the observer's callback: the new height resizes the screens
    // the kit's fit observes, which in the same frame ends in "ResizeObserver loop completed".
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(publish);
    });
    observer.observe(el);
    publish();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      root.style.removeProperty(VAR);
    };
  }, [wrapper]);
}
