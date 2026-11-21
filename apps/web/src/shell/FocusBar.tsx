/**
 * @file   apps/web/src/shell/FocusBar.tsx
 * @brief  Focus mode during a live show: the kit's game bar in place of the app header, and its
 *         panels (CONCEPT §7).
 *
 * Responsibility: the bar's lead "Seasonal Cases", its facts "cases left" and "prizes left"
 *                 (counted from the received view), full screen where the browser offers it, and
 *                 the panel buttons: players (the owners), and for the direction holder on a
 *                 phone the direction panel, so the bar's buttons are never below the fold. The
 *                 chat button joins in website mode (piece 4). One panel at a time (`usePanels`).
 * Depends on:     react, @seasonal/kit/react, @sc/contracts (types), ../stage/DirectionBar.js,
 *                 ../stage/Stage.js
 */
import {
  GameBar,
  useDockView,
  useFocusMode,
  useFullscreen,
  usePanels,
  type BarAction,
} from '@seasonal/kit/react';
import type { Me, ModeratorView, PublicShowView } from '@sc/contracts';
import type { ReactNode, RefObject } from 'react';

import { DirectionBar } from '../stage/DirectionBar.js';
import { holderView, type Direct } from '../stage/Stage.js';

export type PanelId = 'players' | 'direction' | 'chat';

export interface FocusBarProps {
  readonly show: PublicShowView;
  readonly moderator: ModeratorView | null;
  readonly me: Me | null;
  readonly direct: Direct;
  readonly target: RefObject<HTMLElement | null>;
  // The chat panel's content and unread count in website mode; absent otherwise.
  readonly chat?: { readonly unread: number; readonly content: ReactNode };
}

/** The bar's facts, counted from the view. */
export function focusFacts(show: PublicShowView): { casesLeft: number; prizesLeft: number } {
  const opened = show.cases.filter((c) => c.opened);
  const prizesFound = opened.filter((c) => c.artifact?.prizeSlot !== null).length;
  return { casesLeft: show.caseCount - opened.length, prizesLeft: show.winnerCount - prizesFound };
}

function Players({ show }: { show: PublicShowView }) {
  return (
    <ul className="focus-players">
      {show.cases.map((c) => (
        <li key={c.number}>
          <span className="show-font">{c.number}</span> {c.ownerName ?? 'no owner'}
        </li>
      ))}
    </ul>
  );
}

export function FocusBar({ show, moderator, me, direct, target, chat }: FocusBarProps) {
  useFocusMode(true);
  const panels = usePanels<PanelId>();
  const fullscreen = useFullscreen(target);
  const view = useDockView();
  const holder = holderView(show, moderator, me);
  const { casesLeft, prizesLeft } = focusFacts(show);
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
        lead={<span className="focus-lead">Seasonal Cases</span>}
        facts={[
          { text: `${String(casesLeft)} cases left` },
          { text: `${String(prizesLeft)} prizes left` },
        ]}
        actions={actions}
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
          {panels.open === 'chat' && chat?.content}
        </aside>
      )}
    </>
  );
}
