/**
 * @file   apps/web/src/shell/useChatHandOver.ts
 * @brief  The game bar's chat button hands over to the docked chat instead of a panel of its own.
 *
 * Responsibility: the website's chat is mounted once, in the kit's dock (GAME-INTEGRATION §5), so
 *                 a second frame in a bar panel would load it twice. When the bar opens its
 *                 `chat` panel, this closes it again at once and opens the dock's chat: on a
 *                 phone it presses the dock's chat bar, which opens the kit's sheet (the sheet
 *                 takes the focus, kit v0.10.0); on a desktop, where the strip is always in sight,
 *                 it moves the focus into the strip. The dock's classes are the kit's own
 *                 (`sk-chat-bar`, `sk-chat-dock-body`, @seasonal/kit/react ChatDock).
 * Depends on:     react
 */
import { useEffect } from 'react';

// The part of the kit's `usePanels` this needs.
interface OpenPanel {
  readonly open: string | null;
  readonly close: () => void;
}

export function useChatHandOver({ open, close }: OpenPanel): void {
  useEffect(() => {
    if (open !== 'chat') return;
    close();
    const phoneBar = document.querySelector<HTMLButtonElement>('.sk-chat-bar');
    if (phoneBar !== null) {
      phoneBar.click();
      return;
    }
    const strip = document.querySelector<HTMLElement>('.sk-chat-dock-body iframe');
    strip?.scrollIntoView({ block: 'nearest' });
    strip?.focus();
  }, [open, close]);
}
