// @vitest-environment node
/**
 * @file   apps/web/src/guards.test.ts
 * @brief  The kit's static guards over the client (K66): no fixed colour in a component, no text
 *         under the 14 px floor, and the tokens' text keeps its contrast in both themes.
 *
 * The contrast pairs are the ones the game's style sheets draw: text colours on the page, on a
 * card and on a surface, and the text on the solid pill and on the season colours. The success
 * green is drawn as it is on cards and surfaces; on the bare page the shade of it that
 * ./board/board.css mixes is checked, and the controls' disabled text on the second surface.
 * Depends on:     @seasonal/kit/testing, node:fs, node:module, node:url
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { findFixedColours, findLowContrast, findSmallText } from '@seasonal/kit/testing';
import { describe, expect, it } from 'vitest';

const SOURCES = [fileURLToPath(new URL('./', import.meta.url))];
const tokens = readFileSync(
  createRequire(import.meta.url).resolve('@seasonal/kit/tokens.css'),
  'utf8',
);

const PAGE = ['--sk-color-background', '--sk-page-background'];
const CARD = [...PAGE, '--sk-color-card'];
const SURFACE = ['--sk-color-surface'];
const TEXTS = ['--sk-color-text', '--sk-color-text-muted', '--sk-color-danger'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'].map((s) => `--sk-color-${s}`);

const pairs = [
  ...TEXTS.flatMap((text) => [PAGE, CARD, SURFACE].map((on) => ({ text, on }))),
  ...[CARD, SURFACE].map((on) => ({ text: '--sk-color-success', on })),
  { text: 'color-mix(in srgb, var(--sk-color-success) 85%, var(--sk-color-text))', on: PAGE },
  // The kit's controls: a disabled button or field, and its danger button on a card.
  { text: '--sk-color-text-muted', on: ['--sk-color-surface-2'] },
  { text: '--sk-color-on-solid', on: ['--sk-color-solid'] },
  ...SEASONS.map((season) => ({ text: '--sk-color-on-season', on: [season] })),
];

describe('the client', () => {
  it('names no fixed colour in a component', () => {
    expect(findFixedColours(SOURCES)).toEqual([]);
  });

  it('sets no text under 14 px', () => {
    expect(findSmallText(SOURCES)).toEqual([]);
  });

  it('keeps its text readable on its backgrounds in both themes', () => {
    expect(findLowContrast({ css: [tokens], pairs })).toEqual([]);
  });
});
