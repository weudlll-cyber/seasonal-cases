/**
 * @file   apps/web/src/lib/feed.ts
 * @brief  The live feed of a show: the current show's id and the projections the socket sends.
 *
 * Responsibility: `useCurrentShowId` asks the server which show the lobby shows and asks again
 *                 every few seconds, so a new show from /admin appears by itself. `useShowFeed`
 *                 watches one show over socket.io and keeps the last public, moderator and
 *                 personal view it received; `direct` sends a direction message and resolves
 *                 with its ack. The client only renders what it receives (CONCEPT §8).
 * Depends on:     react, socket.io-client, @sc/contracts (types), ./api.js
 */
import type {
  Ack,
  ClientToServerEvents,
  Me,
  ModeratorView,
  PersonalView,
  PublicShowView,
  ServerToClientEvents,
} from '@sc/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { getJson } from './api.js';

const POLL_MS = 3000;

/** The id of the show the lobby shows, or null when there is none yet. */
export function useCurrentShowId(): string | null | undefined {
  const [id, setId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const ask = () => {
      getJson<{ show: PublicShowView | null }>('/api/shows/current')
        .then((answer) => {
          if (alive) setId(answer.show?.id ?? null);
        })
        .catch(() => undefined);
    };
    ask();
    const timer = window.setInterval(ask, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);
  return id;
}

export interface ShowFeed {
  readonly show: PublicShowView | null;
  readonly moderator: ModeratorView | null;
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
  const [moderator, setModerator] = useState<ModeratorView | null>(null);
  const [personal, setPersonal] = useState<PersonalView | null>(null);
  const socketRef = useRef<Client | null>(null);
  // `me` matters only through its id: a new sign-in needs a new socket with the new cookie.
  const meId = me?.id ?? null;
  const ready = me !== undefined;
  useEffect(() => {
    if (showId === null || showId === undefined || !ready) return undefined;
    const socket: Client = io({ transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('show:public', setShow);
    socket.on('show:moderator', (view) => {
      setModerator(view);
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
      setModerator(null);
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
  return { show, moderator, personal, direct };
}
