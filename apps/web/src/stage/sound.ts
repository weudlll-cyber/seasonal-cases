/**
 * @file   apps/web/src/stage/sound.ts
 * @brief  The stage's sound: which cue each change of the view plays, and the cues themselves,
 *         synthesised with Web Audio (SC-N3 piece 5).
 *
 * Responsibility: no files and no downloads: every cue is built from oscillators and filtered
 *                 noise. `cuesFor` maps a view change to its cues, the same changes the motion
 *                 follows: the opening begins (a rising tone and the ticks of the cases rolling
 *                 in), a case is selected (a soft drum-roll while it travels), a case opens (a
 *                 chime on a prize; a fanfare and a cheer-like noise burst on the main prize),
 *                 the show ends (applause for the ceremony). Off until the viewer turns it on
 *                 (`useSound`, browsers need a gesture); the choice is remembered per browser
 *                 (localStorage `sc-sound`); the volume is the show's (settings, 0 to 100).
 *                 Reduced motion does not silence it: sound is its own choice.
 * Depends on:     react, @sc/contracts (types)
 */
import type { PublicShowView } from '@sc/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Cue = 'opening' | 'ticks' | 'drumroll' | 'chime' | 'fanfare' | 'applause';

const MAIN_PRIZE = 1;
const STORAGE_KEY = 'sc-sound';

const opening = (v: PublicShowView | null) => v?.state === 'live' && !v.live.begun;

// The case's travel and its opening.
function caseCues(prev: PublicShowView, next: PublicShowView): Cue[] {
  const { selected, step } = next.live;
  if (selected === null) return [];
  if (step === 'selected' && prev.live.selected !== selected) return ['drumroll'];
  if (step !== 'open' || prev.live.step === 'open') return [];
  const slot = next.cases[selected - 1]?.artifact?.prizeSlot ?? null;
  if (slot === null) return [];
  return slot === MAIN_PRIZE ? ['fanfare'] : ['chime'];
}

/** The cues a change from `prev` to `next` plays; none for the first view of a page. */
export function cuesFor(prev: PublicShowView | null, next: PublicShowView): Cue[] {
  if (prev === null || prev.id !== next.id) return [];
  const begins: Cue[] = opening(next) && !opening(prev) ? ['opening', 'ticks'] : [];
  const ends: Cue[] = next.state === 'ended' && prev.state !== 'ended' ? ['applause'] : [];
  return [...begins, ...caseCues(prev, next), ...ends];
}

/** Plays cues on one AudioContext, made on the first gesture that turns the sound on. */
export class Synth {
  private ctx: AudioContext | null = null;

  start(): void {
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
  }

  play(cue: Cue, volume: number): void {
    const ctx = this.ctx;
    if (ctx === null || volume <= 0) return;
    const out = ctx.createGain();
    out.gain.value = (volume / 100) * 0.4;
    out.connect(ctx.destination);
    const t = ctx.currentTime + 0.02;
    CUES[cue](ctx, out, t);
  }
}

type Builder = (ctx: AudioContext, out: AudioNode, t: number) => void;

function tone(ctx: AudioContext, out: AudioNode, at: number, spec: ToneSpec): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = spec.type ?? 'sine';
  osc.frequency.setValueAtTime(spec.from, at);
  if (spec.to !== undefined) osc.frequency.exponentialRampToValueAtTime(spec.to, at + spec.length);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(spec.level ?? 0.6, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.length);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + spec.length + 0.05);
}

interface ToneSpec {
  readonly from: number;
  readonly to?: number;
  readonly length: number;
  readonly level?: number;
  readonly type?: OscillatorType;
}

// Filtered white noise: the drum's skin, the crowd's hands. A seeded sequence: no Math.random.
function noise(ctx: AudioContext, out: AudioNode, at: number, spec: NoiseSpec): void {
  const length = Math.ceil(ctx.sampleRate * spec.length);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x9e3779b9;
  for (let i = 0; i < length; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 0x80000000 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = spec.band;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(spec.level, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.length);
  source.connect(filter).connect(gain).connect(out);
  source.start(at);
}

interface NoiseSpec {
  readonly length: number;
  readonly band: number;
  readonly level: number;
}

const CUES: Record<Cue, Builder> = {
  opening: (ctx, out, t) => {
    tone(ctx, out, t, { from: 220, to: 660, length: 1.8, level: 0.35, type: 'triangle' });
  },
  ticks: (ctx, out, t) => {
    for (let i = 0; i < 6; i += 1)
      tone(ctx, out, t + i * 0.25, { from: 1800, length: 0.04, level: 0.25 });
  },
  drumroll: (ctx, out, t) => {
    // Fast soft hits that swell over the travel (0.8 s at the default motion).
    for (let i = 0; i < 16; i += 1) {
      noise(ctx, out, t + i * 0.05, { length: 0.06, band: 180, level: 0.2 + i * 0.03 });
    }
  },
  chime: (ctx, out, t) => {
    for (const [i, f] of [880, 1320, 1760].entries()) {
      tone(ctx, out, t + i * 0.08, { from: f, length: 1.2, level: 0.3 });
    }
  },
  fanfare: (ctx, out, t) => {
    for (const [i, f] of [523, 659, 784, 1047].entries()) {
      tone(ctx, out, t + i * 0.14, {
        from: f,
        length: i === 3 ? 1.0 : 0.16,
        level: 0.4,
        type: 'sawtooth',
      });
    }
    noise(ctx, out, t + 0.6, { length: 1.6, band: 1500, level: 0.35 });
  },
  applause: (ctx, out, t) => {
    for (let i = 0; i < 24; i += 1)
      noise(ctx, out, t + i * 0.09, { length: 0.08, band: 2200, level: 0.25 });
  },
};

/** Whether this browser asked for the sound; off unless it did. */
export function soundWanted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

/** The page's sound: the toggle (remembered) and the cues of each new view. */
export function useSound(show: PublicShowView | null): { on: boolean; toggle: () => void } {
  const synth = useRef<Synth | null>(null);
  const previous = useRef<PublicShowView | null>(null);
  const [on, setOn] = useState(soundWanted);
  const toggle = useCallback(() => {
    setOn((was) => {
      const next = !was;
      if (next) {
        synth.current ??= new Synth();
        synth.current.start();
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
      } catch {
        // A private window without storage: the choice lasts this page.
      }
      return next;
    });
  }, []);
  // A remembered "on" starts at the viewer's first tap or click: browsers allow audio only then.
  useEffect(() => {
    if (!on || synth.current !== null) return undefined;
    const start = () => {
      synth.current ??= new Synth();
      synth.current.start();
    };
    window.addEventListener('pointerdown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
    };
  }, [on]);
  useEffect(() => {
    if (show === null) return;
    const cues = cuesFor(previous.current, show);
    previous.current = show;
    if (!on || synth.current === null) return;
    for (const cue of cues) synth.current.play(cue, show.presentation.volume);
  }, [show, on]);
  return { on, toggle };
}
