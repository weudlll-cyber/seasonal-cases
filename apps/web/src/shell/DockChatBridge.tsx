/**
 * @file   apps/web/src/shell/DockChatBridge.tsx
 * @brief  The docked chat's state for the game bar, which sits above the dock: its unread count
 *         and the kit's "open the chat" function.
 *
 * Responsibility: the kit's `useOpenDockChat()` (v0.13.0) works only inside `DockedScreen`'s
 *                 children, and Cases' bar is a sibling above the dock (keeping the bar out of
 *                 the dock's scrolling area keeps the stage's height as it is). `useDockChat`
 *                 holds what the bar needs (`chat`: the unread count and `open`) and what the
 *                 dock needs (`onUnread`, `into`); `DockChatBridge` renders nothing, sits inside
 *                 the dock, and puts the kit's function into the ref `open` calls.
 * Depends on:     react, @seasonal/kit/react
 */
import { useOpenDockChat } from '@seasonal/kit/react';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface DockChat {
  // For the bar: the unread count of the button's badge, and the function that opens the chat.
  readonly chat: { readonly unread: number; readonly open: () => void };
  // For the dock: where the unread count goes, and where the bridge puts the kit's function.
  readonly onUnread: (unread: number) => void;
  readonly into: RefObject<() => void>;
}

export function useDockChat(): DockChat {
  const [unread, onUnread] = useState(0);
  const into = useRef<() => void>(() => undefined);
  const open = useCallback(() => {
    into.current();
  }, []);
  return { chat: { unread, open }, onUnread, into };
}

export function DockChatBridge({ into }: { into: RefObject<() => void> }): null {
  const open = useOpenDockChat();
  useEffect(() => {
    into.current = open;
  }, [into, open]);
  return null;
}
