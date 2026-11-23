/**
 * @file   apps/web/src/shell/FocusBar.tsx
 * @brief  Focus mode during a live show: the kit's game bar in place of the app header, and its
 *         panels (CONCEPT §7).
 *
 * Responsibility: the bar's lead "Seasonal Cases", its facts "cases left" and "prizes left"
 *                 (counted from the received view), full screen where the browser offers it, and
 *                 the panel buttons: players (the owners), and for the direction holder on a
 *                 phone the direction panel, so the bar's buttons are never below the fold. The
 *                 chat button joins wherever the screens are docked, with the dock's unread
 *                 count as its badge, and opens the dock's own chat (@sc/ui useChatHandOver). The
 *                 sound is the kit's toggle (v0.11.0); "Applaud" for everyone watching (D39, sent
 *                 as `show:applaud`). One panel at a time (`usePanels`);
 *                 Escape closes the open one from anywhere on the page, as Mini Games' focus
 *                 shell does from its bar (the kit's hook leaves the key to the game).
 * Depends on:     react, @seasonal/kit/react, @sc/contracts, @sc/ui, ../stage/DirectionBar.js,
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
import { BarPress, useChatHandOver } from '@sc/ui';
import { useEffect, type RefObject } from 'react';

import { DirectionBar } from '../stage/DirectionBar.js';
import { showFacts } from '../stage/facts.js';
import { holderView, type Direct } from '../stage/Stage.js';

export type PanelId = 'players' | 'direction' | 'chat';

export interface FocusBarProps {
  readonly show: PublicShowView;
  readonly organiser: OrganiserView | null;
  readonly me: Me | null;
  readonly direct: Direct;
  readonly target: RefObject<HTMLElement | null>;
  // The docked chat's unread count, wherever the screens are docked; absent otherwise.
  readonly chat?: { readonly unread: number } | undefined;
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

export function FocusBar({ show, organiser, me, direct, target, chat, sound }: FocusBarProps) {
  useFocusMode(true);
  const panels = usePanels<PanelId>();
  useEscapeCloses(panels);
  useChatHandOver(panels);
  const fullscreen = useFullscreen(target);
  const view = useDockView();
  const holder = holderView(show, organiser, me);
  const { casesLeft, prizesLeft } = showFacts(show);
  const actions: BarAction<PanelId>[] = [
    ...(chat === undefined
      ? []
      : [{ id: 'chat' as const, icon: 'chat' as const, label: 'Chat', badge: chat.unread }]),
    { id: 'players', icon: 'players', label: 'Players' },
    ...(holder !== null && view === 'phone'
      ? [{ id: 'direction' as const, icon: 'host' as const, label: 'Direction' }]
      : []),
  ];
  return (
    <>
      <GameBar
        lead={
          <>
            <span className="focus-lead">Seasonal Cases</span>
            <BarPress
              label="Applaud"
              tip="Applaud: the stage counts it, and the confetti grows with it"
              onPress={() => {
                void direct('show:applaud', { showId: show.id });
              }}
            />
          </>
        }
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
        panels={panels}
        fullscreen={fullscreen}
        buttonClassName="button"
      />
      {panels.open !== null && (
        <aside className="focus-panel" aria-label={panels.open}>
          {panels.open === 'players' && <Players show={show} />}
          {panels.open === 'direction' && holder !== null && me !== null && (
            <DirectionBar view={holder} me={me} direct={direct} />
          )}
        </aside>
      )}
    </>
  );
}
