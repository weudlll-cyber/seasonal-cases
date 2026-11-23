/**
 * @file   apps/web/src/stage/sound.test.tsx
 * @brief  Tests the sound: which view change plays which cue, and that it is off until asked for.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KEY, liveView, STONE } from '../testing/views.js';
import { cuesFor, useSound } from './sound.js';

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('cuesFor', () => {
  it('plays nothing for the first view of a page or a change of show', () => {
    const view = liveView('selected');
    expect(cuesFor(null, view)).toEqual([]);
    expect(cuesFor({ ...view, id: 'other' }, view)).toEqual([]);
  });

  it('follows the motion: opening, drum-roll, chime or fanfare, applause', () => {
    const idle = liveView('idle');
    const opening = { ...idle, live: { ...idle.live, begun: false } };
    expect(cuesFor({ ...idle, state: 'sealed' }, opening)).toEqual(['opening', 'ticks']);
    expect(cuesFor(idle, liveView('selected'))).toEqual(['drumroll']);
    expect(cuesFor(liveView('selected'), liveView('open', STONE))).toEqual(['fanfare']);
    expect(cuesFor(liveView('selected', KEY), liveView('open', KEY))).toEqual(['chime']);
    expect(cuesFor(liveView('open', KEY), liveView('owner', KEY))).toEqual([]);
    const ended = { ...idle, state: 'ended' as const };
    expect(cuesFor(idle, ended)).toEqual(['applause']);
  });
});

describe('useSound', () => {
  it('is off until the viewer turns it on, and remembers the choice', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        resume = () => Promise.resolve();
      },
    );
    const first = renderHook(() => useSound(null));
    expect(first.result.current.on).toBe(false);
    act(() => {
      first.result.current.toggle();
    });
    expect(first.result.current.on).toBe(true);
    expect(window.localStorage.getItem('sc-sound')).toBe('on');
    const again = renderHook(() => useSound(null));
    expect(again.result.current.on).toBe(true);
  });
});
