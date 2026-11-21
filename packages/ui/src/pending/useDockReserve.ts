/**
 * @file   packages/ui/src/pending/useDockReserve.ts
 * @brief  The height a stage screen keeps free at the bottom for the chat dock to come.
 *
 * Responsibility: kit adoption item "kit: dock reserve without a chat" (docs/BACKLOG.md 13):
 *                 the kit's `DockedScreen` reserves its strip only when it renders a chat. The
 *                 prototype has no chat yet, so its stage screens keep the dock's height free
 *                 by hand (DECISIONS D7): on the desktop view (the kit's `useDockView`) the
 *                 call slot's height, 190 px, or 150 px under 760 px of window height, from the
 *                 kit's `CALL_SLOT`; on the phone view nothing. Delete it once the screens sit
 *                 in `DockedScreen`.
 * Depends on:     react, @seasonal/kit (CALL_SLOT), @seasonal/kit/react (useDockView)
 */
import { CALL_SLOT } from '@seasonal/kit';
import { useDockView } from '@seasonal/kit/react';
import { useEffect, useState } from 'react';

/** The reserved height in pixels, following the window. */
export function useDockReserve(): number {
  const view = useDockView();
  const [height, setHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => {
      setHeight(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);
  if (view !== 'desktop') return 0;
  return height < CALL_SLOT.lowBelow ? CALL_SLOT.lowHeight : CALL_SLOT.height;
}
