/**
 * @file   apps/web/src/shell/FocusBar.tsx
 * @brief  Focus mode during a live show: the kit's game bar in place of the app header, and its
 *         panels (CONCEPT §7).
 *
 * Responsibility: the way back to Seasonal Entertainment in website mode (the kit's `back`, so the
 *                 focus mode does not lose it), the bar's lead "Seasonal Cases", its facts "cases left" and "prizes left"
 *                 (counted from the received view), full screen where the browser offers it, and
 *                 the panel buttons: players (the owners), and for the direction holder on a
 *                 phone the direction panel, so the bar's buttons are never below the fold. The
 *                 chat button joins wherever the screens are docked, with the dock's unread
 *                 count as its badge, and opens the dock's own chat through the kit's
 *                 `useOpenDockChat` (handed over by ./DockChatBridge.tsx, since the bar sits
 *                 above the dock). The sound is the kit's toggle (v0.11.0); "Applaud" for
 *                 everyone watching (D39, sent as `show:applaud`) is the kit's press button
 *                 (`presses`, v0.13.0). One panel at a time (`usePanels`);
 *                 Escape closes the open one from anywhere on the page, as Mini Games' focus
 *                 shell does from its bar (the kit's hook leaves the key to the game).
 * Depends on:     react, @seasonal/kit/react, @sc/contracts, ../stage/DirectionBar.js,
 *                 ../stage/facts.js, ../stage/Stage.js
 */
import {
  GameBar,
  useDockView,
  useFocusMode,
  useFullscreen,
  usePanels,
  type BarAction,
} from '@seasonal/kit/react';
import { ownerText, type Me, type OrganiserView, type PublicShowView } from '@sc/contracts';
import { useEffect, type RefObject } from 'react';

import { DirectionBar } from '../stage/DirectionBar.js';
import { showFacts } from '../stage/facts.js';
import { holderView, type Direct } from '../stage/Stage.js';

// The panel the bar's buttons open (their `aria-controls`, kit v0.20.0).
const PANEL_ID = 'focus-panel';

export type PanelId = 'players' | 'direction' | 'chat';

export interface FocusBarProps {
  readonly show: PublicShowView;
  readonly organiser: OrganiserView | null;
  readonly me: Me | null;
  readonly direct: Direct;
  readonly target: RefObject<HTMLElement | null>;
  // The docked chat, wherever the screens are docked (absent otherwise): its unread count for
  // the button's badge, and the function that opens it (./DockChatBridge.tsx).
  readonly chat?: { readonly unread: number; readonly open: () => void } | undefined;
  // Website mode: the bar keeps the way back to Seasonal Entertainment (the kit's `back`).
  readonly website: boolean;
  // The stage's sound, on or off for this viewer (../stage/sound.ts).
  readonly sound: { readonly on: boolean; readonly toggle: () => void };
}

function Players({ show }: { show: PublicShowView }) {
  return (
    <ul className="focus-players">
      {show.cases.map((c) => (
        <li key={c.number}>
          <span className="show-font">{c.number}</span> {ownerText(c.ownerName)}
        </li>
      ))}
    </ul>
  );
}

// The part of the kit's `usePanels` the chat hand-over needs.
interface OpenPanel {
  readonly open: string | null;
  readonly close: () => void;
}

/** Escape closes the open panel from anywhere on the page (the kit leaves the key to the game). */
function useEscapeCloses({ open, close }: { open: PanelId | null; close: () => void }): void {
  useEffect(() => {
    if (open === null) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
}

/** The bar's chat button opens the dock's chat, not a panel of its own: closed again at once. */
function useChatHandOver({ open, close }: OpenPanel, openChat: (() => void) | undefined): void {
  useEffect(() => {
    if (open !== 'chat') return;
    close();
    openChat?.();
  }, [open, close, openChat]);
}

/** The bar's panel buttons: the dock's chat where there is one, the players, the direction. */
function actionsOf(chat: FocusBarProps['chat'], direction: boolean): BarAction<PanelId>[] {
  return [
    ...(chat === undefined
      ? []
      : [{ id: 'chat' as const, icon: 'chat' as const, label: 'Chat', badge: chat.unread }]),
    { id: 'players', icon: 'players', label: 'Players', controls: PANEL_ID },
    ...(direction
      ? [
          {
            id: 'direction' as const,
            icon: 'host' as const,
            label: 'Direction',
            controls: PANEL_ID,
          },
        ]
      : []),
  ];
}

export function FocusBar({
  show,
  organiser,
  me,
  direct,
  target,
  chat,
  sound,
  website,
}: FocusBarProps) {
  useFocusMode(true);
  const panels = usePanels<PanelId>();
  useEscapeCloses(panels);
  useChatHandOver(panels, chat?.open);
  const fullscreen = useFullscreen(target);
  const view = useDockView();
  const holder = holderView(show, organiser, me);
  const { casesLeft, prizesLeft } = showFacts(show);
  const actions = actionsOf(chat, holder !== null && view === 'phone');
  return (
    <>
      <GameBar
        back={{ websiteMode: website }}
        lead={<span className="focus-lead">Seasonal Cases</span>}
        facts={[
          { text: `${String(casesLeft)} cases left` },
          // Read out on a phone: the scoreboard above the stage shows the prizes there.
          { text: `${String(prizesLeft)} prizes left`, desktopOnly: true },
        ]}
        time={null}
        actions={actions}
        toggles={[
          { id: 'sound', icon: 'sound', label: 'Sound', on: sound.on, onToggle: sound.toggle },
        ]}
        presses={[
          {
            id: 'applaud',
            icon: 'applaud',
            label: 'Applaud',
            tip: 'Applaud: the stage counts it, and the confetti grows with it',
            onPress: () => {
              void direct('show:applaud', { showId: show.id });
            },
          },
        ]}
        panels={panels}
        fullscreen={fullscreen}
        buttonClassName="button"
      />
      {panels.open !== null && (
        <aside className="focus-panel" id={PANEL_ID} aria-label={panels.open}>
          {panels.open === 'players' && <Players show={show} />}
          {panels.open === 'direction' && holder !== null && me !== null && (
            <DirectionBar view={holder} me={me} direct={direct} />
          )}
        </aside>
      )}
    </>
  );
}
