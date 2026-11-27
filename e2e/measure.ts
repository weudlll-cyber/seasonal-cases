/**
 * @file   e2e/measure.ts
 * @brief  The game's own measurements, beside the kit's probe (D60, D50).
 *
 * Responsibility: `measure` runs in the page and reads what the kit's probe does not: the
 *                 smallest visible text, whether the document scrolls sideways and which elements
 *                 reach past the window's edge, the risen artifacts whose gem is off their case's
 *                 centre (D50), and the game bar's height. A box of a pixel or less (hidden, or
 *                 kept for screen readers only) is not on screen. `ownFindings` turns that into
 *                 findings for the kit's sweep: text under 14 px, an artifact off its centre, and
 *                 on a phone of CONCEPT §7's sizes at the normal font a game bar of more than
 *                 one row (D60).
 * Depends on:     @playwright/test (types)
 */
import type { Page } from '@playwright/test';

const FLOOR = 14;
// The game bar of a phone is one row: its 44 px buttons and a little room.
const BAR_ONE_ROW = 52;
const PHONE_WIDTH = 700;
// The narrowest phone of CONCEPT §7; the kit's sweep also looks at 320 px, where the bar wraps.
const NARROWEST = 360;

export interface Measures {
  smallestText: number;
  sideways: boolean;
  // Risen artifacts (the front case, the ceremony) whose gem is off their case's centre (D50).
  offCentre: number;
  // The first elements reaching past the window's right edge (only when the page scrolls sideways).
  wide: string[];
  // The game bar's height in px, 0 where there is none: one row at 52 px at most (D60).
  barHeight: number;
  rootFont: number;
}

export async function measure(page: Page): Promise<Measures> {
  return page.evaluate(() => {
    /** The smallest font of visible text. */
    function smallest(): number {
      let least = Infinity;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (parent === null || (node.textContent ?? '').trim() === '') continue;
        const box = parent.getBoundingClientRect();
        if (box.width <= 1 || box.height <= 1) continue;
        least = Math.min(least, parseFloat(getComputedStyle(parent).fontSize));
      }
      return least;
    }

    function wideElements(): string[] {
      const wide: string[] = [];
      for (const el of Array.from(document.body.querySelectorAll('*'))) {
        const box = el.getBoundingClientRect();
        if (box.width > 0 && box.right > window.innerWidth + 1 && wide.length < 4) {
          wide.push(`${el.tagName.toLowerCase()}.${el.className.slice(0, 40)}`);
        }
      }
      return wide;
    }

    const middle = (el: Element | null): number => {
      const box = el?.getBoundingClientRect();
      return box === undefined ? 0 : box.left + box.width / 2;
    };

    /** The risen artifacts whose gem is more than a pixel off their case's centre. */
    function offCentre(): number {
      return Array.from(document.querySelectorAll('.case-picture.is-risen')).filter((c) => {
        const gem = c.querySelector('.artifact-gem');
        return gem !== null && Math.abs(middle(gem) - middle(c.querySelector('.cp-front'))) > 1;
      }).length;
    }

    const sideways = document.documentElement.scrollWidth > window.innerWidth + 1;
    return {
      smallestText: smallest(),
      sideways,
      offCentre: offCentre(),
      wide: sideways ? wideElements() : [],
      barHeight: Math.round(
        document.querySelector('.sk-game-bar')?.getBoundingClientRect().height ?? 0,
      ),
      rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
    };
  });
}

export async function ownFindings(page: Page): Promise<string[]> {
  const seen = await measure(page);
  const width = page.viewportSize()?.width ?? 0;
  const phone = width >= NARROWEST && width < PHONE_WIDTH;
  const tall = phone && seen.rootFont <= 16 && seen.barHeight > BAR_ONE_ROW;
  return [
    ...(seen.smallestText < FLOOR ? [`text of ${String(seen.smallestText)} px`] : []),
    ...(seen.offCentre > 0 ? [`${String(seen.offCentre)} artifacts off their case's centre`] : []),
    ...(tall ? [`the game bar is ${String(seen.barHeight)} px high`] : []),
  ];
}
