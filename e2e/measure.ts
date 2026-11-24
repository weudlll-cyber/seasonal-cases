/**
 * @file   e2e/measure.ts
 * @brief  What the screens run measures on a page, instead of someone looking at it (D60).
 *
 * Responsibility: one function that runs in the page and counts what must not happen on a phone or
 *                 at the largest text: the smallest visible text, whether the document scrolls
 *                 sideways and which elements reach past the window's edge, the labels cut with an
 *                 ellipsis (their text wider than their box) and their texts, the risen artifacts
 *                 whose gem is off their case's centre (D50), and the game bar's height. A box of
 *                 a pixel or less (hidden, or kept for screen readers only) is not on screen.
 * Depends on:     @playwright/test (types)
 */
import type { Page } from '@playwright/test';

export interface Measures {
  smallestText: number;
  sideways: boolean;
  // Visible labels cut with an ellipsis (their text wider than their box), and their texts.
  cut: number;
  cutTexts: string[];
  // Risen artifacts (the front case, the ceremony) whose gem is off their case's centre (D50).
  offCentre: number;
  // The first elements reaching past the window's right edge (only when the page scrolls sideways).
  wide: string[];
  // The game bar's height in px, 0 where there is none: one row at 52 px at most (D60).
  barHeight: number;
}

export async function measure(page: Page): Promise<Measures> {
  return page.evaluate(() => {
    /** The smallest font of visible text, and the texts of the labels an ellipsis cuts. */
    function texts(): { smallest: number; cutTexts: string[] } {
      const cutTexts: string[] = [];
      let smallest = Infinity;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (parent === null || (node.textContent ?? '').trim() === '') continue;
        const box = parent.getBoundingClientRect();
        if (box.width <= 1 || box.height <= 1) continue;
        const style = getComputedStyle(parent);
        smallest = Math.min(smallest, parseFloat(style.fontSize));
        if (style.textOverflow === 'ellipsis' && parent.scrollWidth > parent.clientWidth) {
          cutTexts.push(parent.textContent);
        }
      }
      return { smallest, cutTexts };
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

    const { smallest, cutTexts } = texts();
    const sideways = document.documentElement.scrollWidth > window.innerWidth + 1;
    return {
      smallestText: smallest,
      sideways,
      cut: cutTexts.length,
      cutTexts,
      offCentre: offCentre(),
      wide: sideways ? wideElements() : [],
      barHeight: Math.round(
        document.querySelector('.sk-game-bar')?.getBoundingClientRect().height ?? 0,
      ),
    };
  });
}
