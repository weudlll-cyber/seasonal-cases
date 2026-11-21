/**
 * @file   packages/ui/src/pending/OriginChatFrame.tsx
 * @brief  The website's chat framed from another origin, for local development only.
 *
 * Responsibility: kit adoption item "kit: chat frame on another origin" (docs/BACKLOG.md 23): the
 *                 kit's `WebsiteChatFrame` frames only a path on the game's own site (website
 *                 mode). In local mode with the website's dev server on this PC (SC_CHAT_ORIGIN,
 *                 e.g. http://localhost:5380) the game frames that origin's embed page, which the
 *                 website allows once the game's origin is approved (EMBED.md, Admin → Embedding),
 *                 and talks to it through the kit's checked link `connectChat` with that origin:
 *                 every message's origin, window and `source` are checked there. Unread counts
 *                 reach the dock as the kit's frame does. Delete once the kit frames another
 *                 origin.
 * Depends on:     react, @seasonal/kit (connectChat), @seasonal/kit/react (useShownTheme,
 *                 useDockArrivals)
 */
import { connectChat } from '@seasonal/kit';
import { useDockArrivals, useShownTheme } from '@seasonal/kit/react';
import { useEffect, useRef } from 'react';

// Mini Games' sandbox, as the kit's frame: scripts, the site's own cookie, forms, the popup.
const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups';

export function OriginChatFrame({ origin, room }: { origin: string; room: string }) {
  const theme = useShownTheme();
  const arrivals = useDockArrivals();
  const frame = useRef<HTMLIFrameElement>(null);
  const src = `${origin}/embed/chat?${new URLSearchParams({ room, theme }).toString()}`;
  useEffect(() => {
    const element = frame.current;
    if (element === null) return undefined;
    const link = connectChat({
      frame: element,
      origin,
      visible: true,
      onMessage: (message) => {
        if (message.type === 'unread') arrivals?.frameUnread(message.count);
      },
    });
    return link.close;
  }, [src, origin, arrivals]);
  return (
    <iframe
      ref={frame}
      className="sk-chat-frame"
      title="Chat"
      src={src}
      sandbox={SANDBOX}
      referrerPolicy="strict-origin"
      data-testid="chat-frame"
    />
  );
}
