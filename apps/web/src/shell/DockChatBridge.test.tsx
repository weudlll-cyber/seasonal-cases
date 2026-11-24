/**
 * @file   apps/web/src/shell/DockChatBridge.test.tsx
 * @brief  Tests the docked chat's state for the bar: `open` calls whatever the ref holds, and
 *         inside the kit's dock the bridge puts the kit's "open the chat" function into that ref,
 *         where before it was the do-nothing default.
 */
import { DockedScreen } from '@seasonal/kit/react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DockChatBridge, useDockChat } from './DockChatBridge.js';

afterEach(cleanup);

describe('the docked chat state', () => {
  it('keeps the unread count and opens through the function the ref holds', () => {
    const { result } = renderHook(() => useDockChat());
    expect(result.current.chat.unread).toBe(0);
    act(() => {
      result.current.onUnread(4);
    });
    expect(result.current.chat.unread).toBe(4);
    // The default does nothing; the bridge's function, once put in, is what `open` calls.
    expect(() => {
      result.current.chat.open();
    }).not.toThrow();
    const opened = vi.fn();
    result.current.into.current = opened;
    result.current.chat.open();
    expect(opened).toHaveBeenCalledTimes(1);
  });
});

describe('the dock chat bridge', () => {
  it("replaces the ref's default with the dock's own function, and calling it is safe", () => {
    const noop = () => undefined;
    const into = createRef<() => void>() as { current: () => void };
    into.current = noop;
    render(
      <DockedScreen chat={<p>chat</p>} bar="line" callId={null}>
        <DockChatBridge into={into} />
      </DockedScreen>,
    );
    expect(into.current).not.toBe(noop);
    expect(() => {
      into.current();
    }).not.toThrow();
  });
});
