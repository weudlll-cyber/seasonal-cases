/**
 * @file   packages/ui/src/kit.test.ts
 * @brief  Proves the pinned kit: installed, its JS entries importable, its CSS entries present.
 *
 * Responsibility: one test over every kit entry this project uses (night chain SC-N1 piece 1,
 *                 SC-N2 piece 1): `@seasonal/kit`, `@seasonal/kit/react`, `@seasonal/kit/server`
 *                 and the stylesheets. A wrong pin or a broken export map fails here first.
 */
import { CALL_SLOT, clockText, resolveTheme, storeTheme } from '@seasonal/kit';
import {
  DockedScreen,
  GameBar,
  ResultFrame,
  StartCard,
  ThemeToggle,
  useFitScale,
  useFocusMode,
  useTheme,
} from '@seasonal/kit/react';
import { matchingStep, safeNext, websiteSignInCheck } from '@seasonal/kit/server';
import barCss from '@seasonal/kit/bar.css?raw';
import dockCss from '@seasonal/kit/dock.css?raw';
import fitCss from '@seasonal/kit/fit.css?raw';
import fontsCss from '@seasonal/kit/fonts.css?raw';
import framesCss from '@seasonal/kit/frames.css?raw';
import motionCss from '@seasonal/kit/motion.css?raw';
import tokensCss from '@seasonal/kit/tokens.css?raw';
import { describe, expect, it } from 'vitest';

describe('@seasonal/kit (pinned tag)', () => {
  it('exports the theme logic, the call-slot sizes, the clock and the React pieces', () => {
    // A stored choice wins over the system setting (jsdom has no matchMedia).
    storeTheme('dark');
    expect(resolveTheme()).toBe('dark');
    // The dock's height the stage keeps free (DECISIONS D7).
    expect(CALL_SLOT.height).toBe(190);
    expect(CALL_SLOT.lowHeight).toBe(150);
    expect(clockText(65_000)).toBe('1:05');
    const pieces = [
      DockedScreen,
      GameBar,
      ResultFrame,
      StartCard,
      ThemeToggle,
      useFitScale,
      useFocusMode,
      useTheme,
    ];
    expect(pieces.every((f) => typeof f === 'function')).toBe(true);
  });

  it('exports the server checks', () => {
    expect([websiteSignInCheck, matchingStep, safeNext].every((f) => typeof f === 'function')).toBe(
      true,
    );
  });

  it('ships the CSS entries the client imports', () => {
    expect(tokensCss).toContain('--sk-color-spring');
    expect(fontsCss).toContain('Luxora Grotesk');
    expect(motionCss).toContain('prefers-reduced-motion');
    expect(fitCss).toContain('--sk-floor-text');
    expect(barCss).toContain('sk-game-bar');
    expect(dockCss).toContain('sk-docked');
    expect(framesCss).toContain('sk-start');
  });
});
