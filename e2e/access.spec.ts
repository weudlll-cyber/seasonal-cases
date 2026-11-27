/**
 * @file   e2e/access.spec.ts
 * @brief  The accessibility check the kit's handbook asks of every game (the owner made it mandatory
 *         on 2026-11-21): axe on every screen, in light and dark, at a desktop and a phone size.
 *
 * Responsibility: one pass through the game with one show: the guest's start page (the sign-in),
 *                 the registration and its pending page, the start page with the board, the stage
 *                 at the opening, with a case selected, opened and with its owner, the early-end
 *                 question, the ceremony, the result, the chronicle, "My matches", the account
 *                 page and its delete form, the privacy page and the admin's settings. Each is
 *                 checked by axe with the WCAG 2.0 to 2.2 A and AA rules (`target-size` on, since
 *                 axe ships it off) at 1536 x 768 and 390 x 844 in both themes. A finding of
 *                 impact serious or critical fails the run; moderate and minor ones are printed.
 *                 A probe proves the check sees a pointer target under 24 px. Chromium only, in the required `e2e`
 *                 job. Reuses `./helpers.ts` (sign-in, shows, the direction bar, the mail clean-up).
 * Depends on:     @playwright/test, @axe-core/playwright, ./helpers.ts
 */
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import {
  boardCase,
  deleteMailTo,
  direct,
  openShow,
  quickTestSealing,
  signInApi,
  OWN_PAGE,
} from './helpers.js';

const SIZES = [
  [1536, 768],
  [390, 844],
] as const;
const THEMES = ['light', 'dark'] as const;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface Finding {
  readonly text: string;
  readonly impact: string;
}

const found: Finding[] = [];

/** Runs axe on the page as it is now and keeps what it finds, named by screen, size and theme. */
async function check(page: Page, label: string): Promise<void> {
  const result = await new AxeBuilder({ page })
    .withTags(TAGS)
    .options({ rules: { 'target-size': { enabled: true } } })
    .analyze();
  const size = `${String(page.viewportSize()?.width)}x${String(page.viewportSize()?.height)}`;
  for (const v of result.violations) {
    for (const node of v.nodes) {
      const selector = node.target.join(' ');
      found.push({
        impact: v.impact ?? 'minor',
        text: `${v.impact ?? '?'} ${v.id} | ${selector} | ${label} ${size}`,
      });
    }
  }
}

/** The screen as it is, at both sizes in both themes (the state stays; the layout follows). */
async function audit(page: Page, label: string): Promise<void> {
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      // The fit settles in the next frame after a resize; a lid or a card has stopped moving.
      await page.waitForTimeout(400);
      await check(page, `${label} ${theme}`);
    }
  }
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1536, height: 768 });
}

test('axe finds nothing serious on any screen, light and dark, desktop and phone', async ({
  page,
  browser,
}) => {
  test.setTimeout(600_000);

  // The guest: the account forms, then the registration's neutral page (its mail is deleted again).
  await page.goto('/');
  await expect(page.getByRole('form', { name: 'Sign in' })).toBeVisible();
  await audit(page, 'sign-in');
  const email = `access.${String(Date.now())}@example.org`;
  await page
    .getByRole('region', { name: 'Sign in' })
    .getByRole('button', { name: 'Create an account' })
    .click();
  const register = page.getByRole('form', { name: 'Create an account' });
  await register.getByLabel('Name').fill(`Axe${String(Date.now()).slice(-6)}`);
  await register.getByLabel('E-mail').fill(email);
  await register.getByLabel('Password').fill('a long accessibility password');
  await register.getByRole('button', { name: 'Create account' }).click();
  await expect(register.getByRole('status')).toContainText('A mail to this address');
  await audit(page, 'registration-pending');
  await deleteMailTo(page, email);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
  await audit(page, 'privacy');

  // The board: a show in registration, a few claims and one pick by the player who looks.
  await signInApi(page.request, 'Ada', 'admin');
  const boardId = await openShow(page.request, 24, 3);
  const others = await browser.newContext();
  const claimant = await others.newPage();
  await claimant.goto('/');
  for (const [name, rank, n] of [
    ['Hugo', 4, 7],
    ['Ivy', 2, 3],
  ] as const) {
    await signInApi(claimant.request, name, 'player', rank);
    expect(
      (
        await claimant.request.post(`/api/shows/${boardId}/claim`, {
          data: { caseNumber: n },
          ...OWN_PAGE,
        })
      ).ok(),
    ).toBe(true);
  }
  await others.close();
  await signInApi(page.request, 'Lena', 'player', 2);
  await page.goto('/');
  await boardCase(page, 9).getByRole('button').click();
  await expect(page.locator('.board-pick')).toContainText('Your pick: case 9');
  await audit(page, 'board');

  // The signed-in pages: "My matches" with the pick, the account page and its delete form (opened,
  // never sent), the chronicle.
  await page.goto('/matches');
  await expect(page.getByRole('heading', { name: 'My matches' })).toBeVisible();
  await audit(page, 'my-matches');
  await page.goto('/account');
  await expect(page.getByRole('button', { name: 'Download my data' })).toBeVisible();
  await audit(page, 'account');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByRole('form', { name: 'Delete my account' })).toBeVisible();
  await audit(page, 'account-delete');
  await page.goto('/chronicle');
  await page.waitForTimeout(600);
  await audit(page, 'chronicle');

  // The stage: one Quick Test show, directed by the organiser.
  await signInApi(page.request, 'Mia', 'organiser');
  const seed = 'sc-n1-01';
  const main = quickTestSealing(seed, 24, 3).get('prize-1');
  const created = await page.request.post('/api/dev/quick-test', {
    data: { cases: 24, winners: 3, labels: ['Golden Ticket', '', 'Signed Poster'], seed },
    ...OWN_PAGE,
  });
  const { id } = (await created.json()) as { id: string };
  await page.goto('/show');
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await audit(page, 'opening');
  await page.getByRole('button', { name: 'Begin' }).click();
  await page.locator(`.case-token[data-case="${String(main)}"] button`).click();
  await expect(page.locator('.stage-screen')).toHaveAttribute('data-step', 'selected');
  await audit(page, 'selected');
  await direct(page, (bar) => bar.getByRole('button', { name: 'Open' }).click());
  await expect(page.locator('.stage-screen')).toHaveAttribute('data-step', 'open');
  await page.waitForTimeout(1800);
  await audit(page, 'open');
  await direct(page, (bar) => bar.getByRole('button', { name: 'Owner' }).click());
  await expect(page.locator('.lower-third')).toBeVisible();
  await audit(page, 'owner');

  // The early-end question, where the layout puts it: under the stage, or in the bar's panel.
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      // The layout must have followed the new size before `direct` looks at it: a bar still on
      // screen from the old size made it press the phone's button on a desktop and wait for ever
      // (a CI run of SC-N10).
      await expect(
        width < 700
          ? page.getByRole('button', { name: 'Direction', exact: true })
          : page.locator('.stage-screen').getByRole('navigation', { name: 'Direction' }),
      ).toBeVisible();
      await page.waitForTimeout(400);
      await direct(page, async (bar) => {
        await bar.getByRole('button', { name: 'End show' }).click();
        const question = bar.getByRole('group', { name: 'End the show early?' });
        await expect(question).toBeVisible();
        await check(page, `early-end ${theme}`);
        await question.getByRole('button', { name: 'Keep playing' }).click();
      });
    }
  }
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1536, height: 768 });

  // The ceremony and the result of the same show.
  await direct(page, async (bar) => {
    await bar.getByRole('button', { name: 'End show' }).click();
    await bar.getByRole('button', { name: 'End now' }).click();
  });
  const ceremony = page.getByRole('region', { name: 'The winners' });
  await expect(ceremony).toBeVisible();
  await audit(page, 'ceremony');
  await page.goto(`/results/${id}`);
  await expect(page.locator('.result-seal')).toContainText('verified');
  await audit(page, 'result');

  // The admin's settings (a development admin needs no second factor).
  await signInApi(page.request, 'Ada', 'admin');
  await page.goto('/admin');
  await expect(page.getByRole('form', { name: 'Settings' })).toBeVisible();
  await audit(page, 'admin-settings');

  const serious = found.filter((f) => f.impact === 'serious' || f.impact === 'critical');
  const rest = found.filter((f) => !serious.includes(f));
  console.log(`axe: ${String(serious.length)} serious or critical, ${String(rest.length)} others`);
  for (const f of new Set(rest.map((r) => r.text))) console.log(`axe (listed): ${f}`);
  expect([...new Set(serious.map((s) => s.text))]).toEqual([]);
});

test('axe reports a pointer target under 24 px, so the check would see one', async ({ page }) => {
  // Two neighbours: a lone small target has room around it, which WCAG 2.5.8 allows.
  await page.setContent(
    '<main><button style="width:10px;height:10px;padding:0">x</button><button style="width:10px;height:10px;padding:0">y</button></main>',
  );
  const result = await new AxeBuilder({ page })
    .withTags(TAGS)
    .options({ rules: { 'target-size': { enabled: true } } })
    .analyze();
  expect(result.violations.map((v) => v.id)).toContain('target-size');
});
