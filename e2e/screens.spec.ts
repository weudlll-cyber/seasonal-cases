/**
 * @file   e2e/screens.spec.ts
 * @brief  The pictures for the owner and the planning chat: four screens at CONCEPT §7's check
 *         sizes, light and dark, into .local/screens/proto-v1/ (never into git).
 *
 * Responsibility: delete the topic's previous pictures, then shoot the registration board, the
 *                 stage at "selected", the stage at "owner" on the main prize, and the result, at
 *                 every PC and phone size in both themes. Beside each picture it measures the
 *                 smallest visible text and whether the page overflows sideways, and writes all
 *                 findings to `checks.json`. Runs only as the project `screens`.
 * Depends on:     @playwright/test, node:fs, ./helpers.ts
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { boardCase, openShow, quickTestSealing, signInApi } from './helpers.js';

const DIR = fileURLToPath(new URL('../.local/screens/proto-v1/', import.meta.url));
const SIZES = [
  [1280, 720],
  [1366, 768],
  [1536, 768],
  [1440, 900],
  [1900, 860],
  [1920, 1080],
  [375, 667],
  [360, 780],
  [390, 844],
  [430, 932],
] as const;
const THEMES = ['light', 'dark'] as const;
const FLOOR = 14;

interface Check {
  file: string;
  smallestText: number;
  sideways: boolean;
}
const checks: Check[] = [];

/** The smallest font size of any visible text, and whether the page scrolls sideways. */
async function measure(page: Page): Promise<{ smallest: number; sideways: boolean }> {
  return page.evaluate(() => {
    let smallest = Infinity;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (parent === null || (node.textContent ?? '').trim() === '') continue;
      const box = parent.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      smallest = Math.min(smallest, parseFloat(getComputedStyle(parent).fontSize));
    }
    return { smallest, sideways: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
}

async function shoot(page: Page, name: string): Promise<void> {
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      // The fit settles in the next frame after a resize.
      await page.waitForTimeout(350);
      const file = `${name}-${String(width)}x${String(height)}-${theme}.png`;
      await page.screenshot({ path: `${DIR}${file}`, animations: 'disabled' });
      const { smallest, sideways } = await measure(page);
      checks.push({ file, smallestText: smallest, sideways });
    }
  }
}

test('screens: board, selected, owner on the main prize, result', async ({ page, browser }) => {
  test.setTimeout(600_000);
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });

  // The registration board: a show with claims and one conflict, seen by a player.
  await page.goto('/');
  await signInApi(page.request, 'Ada', 'admin');
  const boardId = await openShow(page.request, 24, 3);
  const players = await browser.newContext();
  const claim = await players.newPage();
  await claim.goto('/');
  for (const [name, rank, n] of [
    ['Hugo', 4, 7],
    ['Ivy', 2, 3],
    ['Jonas', 5, 12],
    ['Kemal', 1, 18],
  ] as const) {
    await signInApi(claim.request, name, 'player', rank);
    expect(
      (await claim.request.post(`/api/shows/${boardId}/claim`, { data: { caseNumber: n } })).ok(),
    ).toBe(true);
  }
  await signInApi(page.request, 'Lena', 'player', 2);
  await page.goto('/');
  await boardCase(page, 7).getByRole('button').click();
  await expect(page.locator('.board-pick')).toContainText('Your pick: case 7');
  await shoot(page, 'board');
  await players.close();

  // The stage: a Quick Test show directed by the moderator, the main prize on the centre stage.
  await signInApi(page.request, 'Mia', 'moderator');
  const seed = 'sc-n1-01';
  const main = quickTestSealing(seed, 24, 3).get('prize-1');
  const created = await page.request.post('/api/dev/quick-test', {
    data: { cases: 24, winners: 3, labels: ['Golden Ticket', '', 'Signed Poster'], seed },
  });
  const { id } = (await created.json()) as { id: string };
  await page.goto('/show');
  const bar = page.getByRole('navigation', { name: 'Direction' });
  await page.locator(`.case-token[data-case="${String(main)}"] button`).click();
  await expect(page.locator('.stage-screen')).toHaveAttribute('data-step', 'selected');
  await shoot(page, 'stage-selected');
  for (const label of ['Open', 'Owner']) await bar.getByRole('button', { name: label }).click();
  await expect(page.locator('.lower-third')).toBeVisible();
  await shoot(page, 'stage-owner');

  await bar.getByRole('button', { name: 'End show' }).click();
  await page.goto(`/results/${id}`);
  await expect(page.locator('.result-seal')).toContainText('verified');
  await shoot(page, 'result');

  writeFileSync(`${DIR}checks.json`, JSON.stringify(checks, null, 2));
  const problems = checks.filter((c) => c.smallestText < FLOOR || c.sideways);
  console.log(`${String(checks.length)} pictures, ${String(problems.length)} with findings`);
  for (const p of problems) console.log(JSON.stringify(p));
});
