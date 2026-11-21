/**
 * @file   apps/web/src/lib/feed.test.tsx
 * @brief  Tests fix A of SC-N2 on the client: the feed starts empty for a new show id, and the
 *         current show can be asked for at once.
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { liveView } from '../testing/views.js';
import { useCurrentShow, useShowFeed } from './feed.js';

type Handler = (payload: unknown) => void;
const sockets: { handlers: Map<string, Handler>; disconnect: () => void }[] = [];

vi.mock('socket.io-client', () => ({
  io: () => {
    const handlers = new Map<string, Handler>();
    const socket = {
      handlers,
      on: (event: string, handler: Handler) => {
        handlers.set(event, handler);
        return socket;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
    };
    sockets.push(socket);
    return socket;
  },
}));

afterEach(() => {
  cleanup();
  sockets.length = 0;
  vi.unstubAllGlobals();
});

describe('useShowFeed', () => {
  it('forgets the previous show’s view when the show id changes', () => {
    const me = null;
    const { result, rerender } = renderHook(({ id }) => useShowFeed(id, me), {
      initialProps: { id: 'show-old' },
    });
    const ended = { ...liveView('idle'), id: 'show-old', state: 'ended' as const };
    act(() => {
      sockets[0]?.handlers.get('show:public')?.(ended);
    });
    expect(result.current.show?.state).toBe('ended');
    rerender({ id: 'show-new' });
    expect(result.current.show).toBeNull();
    expect(sockets[0]?.disconnect).toHaveBeenCalled();
    expect(sockets).toHaveLength(2);
  });
});

describe('useCurrentShow', () => {
  it('asks at once on refresh and holds the answer before the caller goes on', async () => {
    let answer = 'show-a';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ show: { id: answer } }), {
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    );
    const { result } = renderHook(() => useCurrentShow());
    await waitFor(() => {
      expect(result.current.id).toBe('show-a');
    });
    answer = 'show-b';
    await act(() => result.current.refresh());
    expect(result.current.id).toBe('show-b');
  });

  it('keeps a show it watched live after it ends, until released or another goes live', async () => {
    let answer = { id: 'live-1', state: 'live' };
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ show: answer }), {
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    );
    const { result } = renderHook(() => useCurrentShow());
    await waitFor(() => {
      expect(result.current.id).toBe('live-1');
    });
    // live-1 ended; the server now names a show in registration: the ceremony stays.
    answer = { id: 'next-2', state: 'registration' };
    await act(() => result.current.refresh());
    expect(result.current.id).toBe('live-1');
    // Another show goes live: the page follows it at once.
    answer = { id: 'live-3', state: 'live' };
    await act(() => result.current.refresh());
    expect(result.current.id).toBe('live-3');
    // live-3 ended and the viewer left the stage: the server's choice again.
    answer = { id: 'next-2', state: 'registration' };
    act(() => {
      result.current.release();
    });
    await act(() => result.current.refresh());
    expect(result.current.id).toBe('next-2');
  });
});
