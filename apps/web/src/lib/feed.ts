/**
 * @file   apps/web/src/lib/feed.ts
 * @brief  The live feed of a show: the current show's id and the projections the socket sends.
 *
 * Responsibility: `useCurrentShow` asks the server which show the lobby shows and asks again
 *                 every few seconds, so a new show from /admin appears by itself; a show that
 *                 ended while this page watched it stays until the viewer leaves the stage. `useShowFeed`
 *                 watches one show over socket.io and keeps the last public, organiser and
 *                 personal view it received; `direct` sends a direction message and resolves
 *                 with its ack. The client only renders what it receives (CONCEPT §8).
 * Depends on:     react, socket.io-client, @sc/contracts (types), ./api.js, ./base.js
 */
import type {
  Ack,
  ClientToServerEvents,
  Me,
  OrganiserView,
  PersonalView,
  PublicShowView,
  ServerToClientEvents,
} from '@sc/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { getJson } from './api.js';
import { apiPath, SOCKET_PATH } from './base.js';

const POLL_MS = 3000;

export interface CurrentShow {
  // undefined while the first answer is pending; null when there is no show at all.
  readonly id: string | null | undefined;
  /** Asks the server at once; resolves once the answer is in the state. */
  readonly refresh: () => Promise<void>;
  /** Lets go of a show that ended while this page watched it (the viewer left the stage). */
  readonly release: () => void;
}

/**
 * The id of the show the lobby and the stage follow (the server's rule, fix A of SC-N2). A show
 * this page followed while it was live stays followed after it ends, so its ceremony plays even
 * when another show is already in registration (SC-N2 piece 10), until `release` or until
 * another show goes live.
 */
export function useCurrentShow(onStage: boolean): CurrentShow {
  const [id, setId] = useState<string | null | undefined>(undefined);
  const held = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    const answer = await getJson<{ show: PublicShowView | null }>(apiPath('/shows/current'));
    const show = answer.show;
    if (show?.state === 'live') held.current = show.id;
    setId(held.current ?? show?.id ?? null);
  }, []);
  const release = useCallback(() => {
    held.current = null;
  }, []);
  // Leaving the stage lets go of a show that ended while it was watched (its ceremony is over).
  useEffect(() => {
    if (!onStage) release();
  }, [onStage, release]);
  useEffect(() => {
    const ask = () => {
      refresh().catch(() => undefined);
    };
    ask();
    const timer = window.setInterval(ask, POLL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [refresh]);
  return { id, refresh, release };
}

export interface ShowFeed {
  readonly show: PublicShowView | null;
  readonly organiser: OrganiserView | null;
  readonly personal: PersonalView | null;
  readonly direct: (event: keyof ClientToServerEvents, payload: object) => Promise<Ack>;
}

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Watches a show; a new user (sign-in) opens a new socket with the new cookie. */
export function useShowFeed(
  showId: string | null | undefined,
  me: Me | null | undefined,
): ShowFeed {
  const [show, setShow] = useState<PublicShowView | null>(null);
  const [organiser, setOrganiser] = useState<OrganiserView | null>(null);
  const [personal, setPersonal] = useState<PersonalView | null>(null);
  const socketRef = useRef<Client | null>(null);
  // `me` matters only through its id: a new sign-in needs a new socket with the new cookie.
  const meId = me?.id ?? null;
  const ready = me !== undefined;
  useEffect(() => {
    if (showId === null || showId === undefined || !ready) return undefined;
    const socket: Client = io({ path: SOCKET_PATH, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('show:public', setShow);
    socket.on('show:organiser', (view) => {
      setOrganiser(view);
      setShow(view.show);
    });
    socket.on('show:personal', setPersonal);
    // Watch again after every reconnect (a server restart rebuilds the show from its log).
    socket.on('connect', () => {
      socket.emit('show:watch', { showId }, () => undefined);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
      // A new show id starts empty: the previous show's screen (its end, say) never shows for
      // the new one.
      setShow(null);
      setOrganiser(null);
      setPersonal(null);
    };
  }, [showId, meId, ready]);
  const direct = useCallback(
    (event: keyof ClientToServerEvents, payload: object) =>
      new Promise<Ack>((resolve) => {
        const socket = socketRef.current;
        if (socket === null) {
          resolve({ ok: false, error: 'not connected' });
          return;
        }
        socket.emit(event, payload, resolve);
      }),
    [],
  );
  return { show, organiser, personal, direct };
}
