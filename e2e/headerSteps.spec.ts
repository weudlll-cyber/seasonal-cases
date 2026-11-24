/**
 * @file   e2e/headerSteps.spec.ts
 * @brief  The website-mode header with the longest member the game can have: a 32-character name
 *         and the three steps (D65), measured on three phones in both themes at the normal and
 *         at a 200 % root font.
 *
 * Responsibility: sign in through the stand-in website as member 9 (./stubShared.ts; the kit
 *                 shortens its 32-character website name to the game's 24), then at
 *                 390 × 844, 375 × 667 and 360 × 780, light and dark, normal and 200 % font,
 *                 assert what the kit's header must still do: no sideways scroll, no text under
 *                 the 14 px floor, and the three steps' icons visible, in the account chip or in
 *                 the folded menu, each named by its step. If the kit's chip cannot hold this and
 *                 neither props nor the game's CSS can fix it, this run fails and the finding goes
 *                 to the kit's planning chat; nothing is changed in the kit. Pictures go to
 *                 .local/screens/header-steps/ (never into git). Runs only as the project
 *                 `screens`.
 * Depends on:     @playwright/test, node:fs, ./helpers.ts, ./measure.ts, ./stubShared.ts
 */
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { openMenu } from './helpers.js';
import { measure } from './measure.js';
import { LONG_NAME, STUB_ORIGIN } from './stubShared.js';

const DIR = fileURLToPath(new URL('../.local/screens/header-steps/', import.meta.url));
const GAME = `${STUB_ORIGIN}/games/cases/`;
const SIZES = [
  [390, 844],
  [375, 667],
  [360, 780],
] as const;
const THEMES = ['light', 'dark'] as const;
const FLOOR = 14;
const STEP_NAMES = ['Golden', 'Sower', 'Backer'];

/** The root font at 200 %, as a phone set to its largest text size shows it; and back. */
async function rootFont(page: Page, large: boolean): Promise<void> {
  await page.evaluate((on) => {
    document.documentElement.style.fontSize = on ? '200%' : '';
  }, large);
  await page.waitForTimeout(350);
}

/** What is wrong with the header on the page now, each finding named by its picture. */
async function problemsOf(page: Page, file: string): Promise<string[]> {
  const problems: string[] = [];
  const found = await measure(page);
  if (found.sideways) problems.push(`${file}: the page scrolls sideways ${found.wide.join()}`);
  if (found.smallestText < FLOOR)
    problems.push(`${file}: text of ${String(found.smallestText)} px`);
  const steps = page.locator('[data-testid="signed-in-as"] .sk-header-step:visible');
  if ((await steps.count()) !== STEP_NAMES.length) {
    problems.push(`${file}: ${String(await steps.count())} of 3 steps visible`);
  }
  // Visible is not enough: a step clipped off the window's right edge still has a box.
  const inside = await page.evaluate(() => {
    const chip = document.querySelector('[data-testid="signed-in-as"]');
    const fits = (el: Element | null): boolean => {
      const box = el?.getBoundingClientRect();
      return box !== undefined && box.left >= 0 && box.right <= window.innerWidth + 1;
    };
    const images = Array.from(chip?.querySelectorAll('.sk-header-step') ?? []);
    return { chip: fits(chip), steps: images.filter((img) => !fits(img)).length };
  });
  if (!inside.chip) problems.push(`${file}: the account chip reaches past the window`);
  if (inside.steps > 0) problems.push(`${file}: ${String(inside.steps)} steps past the window`);
  // The header's own controls (Menu, theme toggle) never cover the brand's text.
  const covered = await page.evaluate(() => {
    const header = document.querySelector('[data-testid="app-header"]');
    const brand = header?.querySelector('.sk-header-brand');
    if (header === null || brand === null || brand === undefined) return 0;
    const range = document.createRange();
    range.selectNodeContents(brand);
    const words = Array.from(range.getClientRects());
    const controls = Array.from(header.querySelectorAll('button'))
      .filter((b) => b.closest('.sk-menu') === null)
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 1);
    const meets = (a: DOMRect, b: DOMRect) =>
      a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    return words.filter((w) => w.width > 1 && controls.some((c) => meets(w, c))).length;
  });
  if (covered > 0) problems.push(`${file}: a header control covers the brand's text`);
  for (const name of STEP_NAMES) {
    const named = steps.and(page.locator(`img[alt="${name}"]`));
    if ((await named.count()) !== 1) problems.push(`${file}: no visible step named ${name}`);
  }
  return problems;
}

test('the header with a 32-character name and three steps holds on a phone', async ({
  browser,
}) => {
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: 'stub-as', value: '9', url: STUB_ORIGIN }]);
  const page = await context.newPage();
  await page.goto(GAME);
  await openMenu(page);
  await page.getByRole('link', { name: 'Sign in' }).click();
  await expect(page.getByTestId('signed-in-as')).toBeAttached();
  expect(LONG_NAME).toHaveLength(32);
  // The kit's `identityFrom` makes the game's name of it: 24 characters at most, the spaces
  // underscores. That is the longest name the header can ever show.
  await expect(page.getByTestId('signed-in-as')).toContainText('Wolfgang_Amadeus_Mozart');

  const problems: string[] = [];
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      for (const large of [false, true]) {
        await rootFont(page, large);
        await openMenu(page);
        const file = `${String(width)}x${String(height)}-${theme}${large ? '-font200' : ''}`;
        await page.screenshot({ path: `${DIR}${file}.png`, animations: 'disabled' });
        problems.push(...(await problemsOf(page, file)));
      }
      await rootFont(page, false);
    }
  }
  console.log(`header steps: ${String(problems.length)} findings`);
  for (const p of problems) console.log(p);
  expect(problems).toEqual([]);
  await context.close();
});
