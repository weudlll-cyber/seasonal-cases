/**
 * @file   e2e/screens.spec.ts
 * @brief  The pictures for the owner and the planning chat: ten screens at 1536 × 768,
 *         1280 × 720 and 390 × 844, light and dark, into .local/screens/proto-v5/ (never into
 *         git).
 *
 * Responsibility: delete the topic's previous pictures, then shoot the sign-in (the start page
 *                 for a guest), the registration's pending page (its mail is deleted from
 *                 Mailpit again), the start page with its registration board, the opening, the
 *                 stage at "selected", "open" and "owner" on the main prize (and the phone's
 *                 direction panel), the early-end question, the result, the ceremony of a show
 *                 nobody claimed a case in (every prize "not won") and the admin's settings, at every
 *                 size in both themes. Beside each picture it measures the smallest visible text
 *                 and whether the page overflows sideways, and writes all findings to
 *                 `checks.json`. Runs only as the project `screens`.
 * Depends on:     @playwright/test, node:fs, ./helpers.ts
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { boardCase, openShow, quickTestSealing, signInApi } from './helpers.js';

const DIR = fileURLToPath(new URL('../.local/screens/proto-v5/', import.meta.url));
// The sizes of night chains SC-N3 piece 8 and SC-N4 piece 7: two PCs and a phone.
const SIZES = [
  [1536, 768],
  [1280, 720],
  [390, 844],
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

/**
 * "End show" asking before an early end, at every size and theme: under the stage on a PC, in
 * the game bar's direction panel on a phone; each picture answers "Keep playing".
 */
async function shootEarlyEnd(page: Page): Promise<void> {
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(350);
      const phone = width < 700;
      if (phone) await page.getByRole('button', { name: 'Direction', exact: true }).click();
      const bar = page.getByRole('navigation', { name: 'Direction' });
      await bar.getByRole('button', { name: 'End show' }).click();
      await expect(bar.getByRole('group', { name: 'End the show early?' })).toBeVisible();
      const file = `early-end-${String(width)}x${String(height)}-${theme}.png`;
      await page.screenshot({ path: `${DIR}${file}`, animations: 'disabled' });
      const { smallest, sideways } = await measure(page);
      checks.push({ file, smallestText: smallest, sideways });
      await bar.getByRole('button', { name: 'Keep playing' }).click();
      if (phone) await page.keyboard.press('Escape');
    }
  }
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 720 });
}

/** Deletes the mails Mailpit holds for this address (its API on 127.0.0.1:8570). */
async function deleteMailTo(page: Page, to: string): Promise<void> {
  const api = 'http://127.0.0.1:8570/api/v1';
  await expect
    .poll(async () => {
      const found = await page.request.get(`${api}/search?query=${encodeURIComponent(`to:${to}`)}`);
      const { messages } = (await found.json()) as { messages: { ID: string }[] };
      if (messages.length > 0) {
        await page.request.delete(`${api}/messages`, { data: { IDs: messages.map((m) => m.ID) } });
      }
      return messages.length;
    })
    .toBeGreaterThan(0);
}

async function shoot(page: Page, name: string, scrollTo?: Locator): Promise<void> {
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      // The fit settles in the next frame after a resize.
      await page.waitForTimeout(350);
      // A part below the fold (the admin's settings) is scrolled into view at every size.
      if (scrollTo !== undefined) await scrollTo.scrollIntoViewIfNeeded();
      const file = `${name}-${String(width)}x${String(height)}-${theme}.png`;
      await page.screenshot({ path: `${DIR}${file}`, animations: 'disabled' });
      const { smallest, sideways } = await measure(page);
      checks.push({ file, smallestText: smallest, sideways });
    }
  }
  // Back to a desktop in light, so the next steps find the direction bar under the stage.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 720 });
}

test('screens: sign-in, start, opening, selected, open, owner, ceremony, result, settings', async ({
  page,
  browser,
}) => {
  test.setTimeout(1_500_000);
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });

  // The start page for a guest: the account forms (local mode) beside the development sign-in.
  await page.goto('/');
  await expect(page.getByRole('form', { name: 'Sign in' })).toBeVisible();
  await shoot(page, 'sign-in');

  // The registration's neutral page while the account waits for its link (D42).
  const email = `screens.${String(Date.now())}@example.org`;
  await page
    .getByRole('region', { name: 'Sign in' })
    .getByRole('button', { name: 'Create an account' })
    .click();
  const register = page.getByRole('form', { name: 'Create an account' });
  await register.getByLabel('Name').fill(`Pia${String(Date.now()).slice(-6)}`);
  await register.getByLabel('E-mail').fill(email);
  await register.getByLabel('Password').fill('a long screens password');
  await register.getByRole('button', { name: 'Create account' }).click();
  await expect(register.getByRole('status')).toContainText('A mail to this address');
  await shoot(page, 'registration-pending');
  await deleteMailTo(page, email);

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
  await shoot(page, 'start');
  await players.close();

  // The stage: a Quick Test show directed by the organiser, the main prize on the centre stage.
  await signInApi(page.request, 'Mia', 'organiser');
  const seed = 'sc-n1-01';
  const main = quickTestSealing(seed, 24, 3).get('prize-1');
  const created = await page.request.post('/api/dev/quick-test', {
    data: { cases: 24, winners: 3, labels: ['Golden Ticket', '', 'Signed Poster'], seed },
  });
  const { id } = (await created.json()) as { id: string };
  await page.goto('/show');
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await shoot(page, 'opening');
  await page.getByRole('button', { name: 'Begin' }).click();
  const bar = page.getByRole('navigation', { name: 'Direction' });
  await page.locator(`.case-token[data-case="${String(main)}"] button`).click();
  await expect(page.locator('.stage-screen')).toHaveAttribute('data-step', 'selected');
  await shoot(page, 'selected');
  await bar.getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('.stage-screen')).toHaveAttribute('data-step', 'open');
  // The lid takes 1.6 s; the picture shows the case opened.
  await page.waitForTimeout(1800);
  await shoot(page, 'open');
  await bar.getByRole('button', { name: 'Owner' }).click();
  await expect(page.locator('.lower-third')).toBeVisible();
  await shoot(page, 'owner');

  // The direction on a phone: the game bar's Direction panel, open (one size, both themes).
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Direction' }).click();
    await expect(page.getByRole('complementary', { name: 'direction' })).toBeVisible();
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${DIR}direction-panel-390x844-${theme}.png` });
    await page.getByRole('button', { name: 'Direction' }).click();
  }
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 720 });

  await shootEarlyEnd(page);
  await bar.getByRole('button', { name: 'End show' }).click();
  await bar
    .getByRole('group', { name: 'End the show early?' })
    .getByRole('button', { name: 'End now' })
    .click();
  await expect(page.getByRole('region', { name: 'The winners' })).toBeVisible();
  await page.goto(`/results/${id}`);
  await expect(page.locator('.result-seal')).toContainText('verified');
  await shoot(page, 'result');

  // The ceremony of a real show nobody claimed a case in: every prize "not won" (D34).
  const empty = await openShow(page.request, 6, 3);
  for (const step of ['close', 'seal', 'start']) {
    expect((await page.request.post(`/api/shows/${empty}/${step}`)).ok()).toBe(true);
  }
  // The page's clock is held, so the ceremony stays on its first prize (one every 2.5 s) for all
  // twelve pictures; without it the run outlasts the ceremony.
  await page.clock.install();
  await page.goto('/show');
  await page.getByRole('button', { name: 'Begin' }).click();
  await bar.getByRole('button', { name: 'End show' }).click();
  await bar.getByRole('button', { name: 'End now' }).click();
  const ceremony = page.getByRole('region', { name: 'The winners' });
  await expect(ceremony.getByRole('status')).toContainText('not won');
  // Paused at the page's own now: no timer is due yet, so nothing moves on.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10);
  await shoot(page, 'ceremony');

  // The admin area with the settings (a development admin needs no second factor).
  await signInApi(page.request, 'Ada', 'admin');
  await page.goto('/admin');
  const settings = page.getByRole('form', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await shoot(page, 'admin-settings', settings);

  writeFileSync(`${DIR}checks.json`, JSON.stringify(checks, null, 2));
  const problems = checks.filter((c) => c.smallestText < FLOOR || c.sideways);
  console.log(`${String(checks.length)} pictures, ${String(problems.length)} with findings`);
  for (const p of problems) console.log(JSON.stringify(p));
});
