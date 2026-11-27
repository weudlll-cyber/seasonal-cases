/**
 * @file   e2e/screens.spec.ts
 * @brief  The pictures for the owner and the planning chat, and every screen's sweep: ten and
 *         more screens at 1536 × 768, 1280 × 720, 390 × 844, 375 × 667 and 360 × 780, light and
 *         dark, into .local/screens/sc-n15/ (never into git).
 *
 * Responsibility: delete the topic's previous pictures, then shoot the sign-in (the start page
 *                 for a guest), the registration's pending page (its mail is deleted from
 *                 Mailpit again), privacy and the account area, the start page with its
 *                 registration board, the opening, the stage at "selected", "open" and "owner" on
 *                 the main prize (and the phone's direction panel), the early-end question, the
 *                 result, the ceremony of a show nobody claimed a case in (every prize "not
 *                 won"), the admin's settings and each role's header. Each screen is also walked
 *                 by the kit's `sweep`: seven sizes, 100 % and 200 % root font, both themes, the
 *                 kit's probe (sideways scroll, boxes past the window, cut text, controls under
 *                 44 px, a cut fitted screen) and axe, with the game's own checks beside them
 *                 (./measure.ts). All findings are written to `findings.txt` and fail the run.
 *                 No screen has a `setup`: the game limits no page read per session, so no walk
 *                 needs a fresh sign-in; and no `floors`: no owner decision names a least number
 *                 of visible items. Runs only as the project `screens`.
 * Depends on:     @playwright/test, @axe-core/playwright, @seasonal/kit/testing, node:fs,
 *                 ./helpers.ts, ./measure.ts
 */
import { appendFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { axeFinder, setTheme, sweep, type SweepScreen } from '@seasonal/kit/testing';

import {
  boardCase,
  deleteMailTo,
  openShow,
  quickTestSealing,
  signInApi,
  OWN_PAGE,
} from './helpers.js';
import { ownFindings } from './measure.js';

const DIR = fileURLToPath(new URL('../.local/screens/sc-n15/', import.meta.url));
// The sizes of CONCEPT §7: two PCs and two phones, the smaller one the tightest for labels.
const SIZES = [
  [1536, 768],
  [1280, 720],
  [390, 844],
  [375, 667],
  [360, 780],
] as const;
// Under this width a size is a phone.
const PHONE_WIDTH = 700;
const THEMES = ['light', 'dark'] as const;
const findings: string[] = [];
const axe = axeFinder(AxeBuilder);

/** The stage opened again: the show's state is the server's, so a reload shows the same step. */
const onStage =
  (shown: Locator): SweepScreen['open'] =>
  async (at) => {
    await at.goto('/show');
    await expect(shown).toBeVisible();
  };

// What the sweep may report and the game accepts, by part of the finding's text:
const KNOWN = [
  // Confetti falls past the stage's edge, the motion as built (D30); it is decoration.
  'span.confetti-piece',
];

/** One screen through the kit's sweep; what it finds is kept, so the run goes on. */
async function walk(page: Page, name: string, open: SweepScreen['open'] = async () => {}) {
  const finder = async (at: Page) => [...(await axe(at)), ...(await ownFindings(at))];
  try {
    await sweep(page, [{ name, open, allow: KNOWN }], { axe: finder });
  } catch (error) {
    const found = error instanceof Error ? error.message : String(error);
    findings.push(found);
    // Written as found, so a long run shows where it stands.
    appendFileSync(`${DIR}findings.txt`, `${found}\n`);
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await setTheme(page, 'light');
  await page.setViewportSize({ width: 1280, height: 720 });
}

/**
 * "End show" asking before an early end, at every size and theme: under the stage on a PC, in
 * the game bar's direction panel on a phone; each picture answers "Keep playing".
 */
async function shootEarlyEnd(page: Page): Promise<void> {
  for (const theme of THEMES) {
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      await setTheme(page, theme);
      await page.waitForTimeout(350);
      const phone = width < PHONE_WIDTH;
      if (phone) await page.getByRole('button', { name: 'Direction', exact: true }).click();
      const bar = page.getByRole('navigation', { name: 'Direction' });
      await bar.getByRole('button', { name: 'End show' }).click();
      await expect(bar.getByRole('group', { name: 'End the show early?' })).toBeVisible();
      await capture(page, `early-end-${String(width)}x${String(height)}-${theme}.png`);
      await bar.getByRole('button', { name: 'Keep playing' }).click();
      if (phone) await page.keyboard.press('Escape');
    }
  }
  await setTheme(page, 'light');
  await page.setViewportSize({ width: 1280, height: 720 });
}

const capture = (page: Page, file: string) =>
  page.screenshot({ path: `${DIR}${file}`, animations: 'disabled' });

/**
 * The theme without a wait, for a page whose clock is held: the kit's `setTheme` waits for motion
 * on the page's own timers, which then never fire. The attribute is what the tokens follow.
 */
const setThemeHeld = (page: Page, theme: (typeof THEMES)[number]) =>
  page.evaluate((wanted) => {
    document.documentElement.setAttribute('data-theme', wanted);
  }, theme);

async function shoot(
  page: Page,
  name: string,
  { scrollTo, themed = setTheme }: { scrollTo?: Locator; themed?: typeof setThemeHeld } = {},
): Promise<void> {
  for (const theme of THEMES) {
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      await themed(page, theme);
      // The fit settles in the next frame after a resize.
      await page.waitForTimeout(350);
      // A part below the fold (the admin's settings) is scrolled into view at every size.
      if (scrollTo !== undefined) await scrollTo.scrollIntoViewIfNeeded();
      await capture(page, `${name}-${String(width)}x${String(height)}-${theme}.png`);
    }
  }
  // Back to a desktop in light, so the next steps find the direction bar under the stage.
  await themed(page, 'light');
  await page.setViewportSize({ width: 1280, height: 720 });
}

test('screens: sign-in, start, opening, selected, open, owner, ceremony, result, settings', async ({
  page,
  browser,
}) => {
  test.setTimeout(3_600_000);
  mkdirSync(DIR, { recursive: true });
  // The topic's previous state, but for the header run's own folder (./headerSteps.spec.ts).
  for (const entry of readdirSync(DIR)) {
    if (entry !== 'header-steps') rmSync(`${DIR}${entry}`, { recursive: true, force: true });
  }

  // The start page for a guest: the account forms (local mode) beside the development sign-in.
  await page.goto('/');
  await expect(page.getByRole('form', { name: 'Sign in' })).toBeVisible();
  await shoot(page, 'sign-in');
  await walk(page, 'sign-in', async (at) => {
    await at.goto('/');
    await expect(at.getByRole('form', { name: 'Sign in' })).toBeVisible();
  });

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
  await walk(page, 'registration-pending');
  await deleteMailTo(page, email);

  // The registration board: a show with claims and one conflict, seen by a player.
  await page.goto('/');
  await signInApi(page.request, 'Ada', 'admin');
  // The privacy page and the account area (D61): the account with its download, then the delete
  // form opened (never sent).
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
  await shoot(page, 'privacy');
  await walk(page, 'privacy', async (at) => {
    await at.goto('/privacy');
    await expect(at.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
  });
  await page.goto('/account');
  await expect(page.getByRole('button', { name: 'Download my data' })).toBeVisible();
  await shoot(page, 'account');
  await walk(page, 'account', async (at) => {
    await at.goto('/account');
    await expect(at.getByRole('button', { name: 'Download my data' })).toBeVisible();
  });
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByRole('form', { name: 'Delete my account' })).toBeVisible();
  await shoot(page, 'account-delete');
  await walk(page, 'account-delete', async (at) => {
    await at.goto('/account');
    await at.getByRole('button', { name: 'Delete my account' }).click();
  });
  await page.goto('/');
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
      (
        await claim.request.post(`/api/shows/${boardId}/claim`, {
          data: { caseNumber: n },
          ...OWN_PAGE,
        })
      ).ok(),
    ).toBe(true);
  }
  await signInApi(page.request, 'Lena', 'player', 2);
  await page.goto('/');
  await boardCase(page, 7).getByRole('button').click();
  await expect(page.locator('.board-pick')).toContainText('Your pick: case 7');
  await shoot(page, 'start');
  await walk(page, 'start', async (at) => {
    await at.goto('/');
    await expect(boardCase(at, 7)).toBeVisible();
  });
  await players.close();

  // The stage: a Quick Test show directed by the organiser, the main prize on the centre stage.
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
  await shoot(page, 'opening');
  await walk(page, 'opening', onStage(page.getByRole('button', { name: 'Begin' })));
  await page.getByRole('button', { name: 'Begin' }).click();
  const bar = page.getByRole('navigation', { name: 'Direction' });
  await page.locator(`.case-token[data-case="${String(main)}"] button`).click();
  await expect(page.locator('.stage-screen')).toHaveAttribute('data-step', 'selected');
  await shoot(page, 'selected');
  await walk(page, 'selected', onStage(page.locator('.stage-screen[data-step="selected"]')));
  await bar.getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('.stage-screen')).toHaveAttribute('data-step', 'open');
  // The lid takes 1.6 s; the picture shows the case opened.
  await page.waitForTimeout(1800);
  await shoot(page, 'open');
  await walk(page, 'open', onStage(page.locator('.stage-screen[data-step="open"]')));
  await bar.getByRole('button', { name: 'Owner' }).click();
  await expect(page.locator('.lower-third')).toBeVisible();
  await shoot(page, 'owner');
  await walk(page, 'owner', onStage(page.locator('.lower-third')));

  // The direction on a phone: the game bar's Direction panel, open (one size, both themes).
  for (const theme of THEMES) {
    await page.setViewportSize({ width: 390, height: 844 });
    await setTheme(page, theme);
    await page.getByRole('button', { name: 'Direction' }).click();
    await expect(page.getByRole('complementary', { name: 'direction' })).toBeVisible();
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${DIR}direction-panel-390x844-${theme}.png` });
    await page.getByRole('button', { name: 'Direction' }).click();
  }
  await setTheme(page, 'light');
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
  await walk(page, 'result', async (at) => {
    await at.goto(`/results/${id}`);
    await expect(at.locator('.result-seal')).toContainText('verified');
  });

  // The ceremony of a real show nobody claimed a case in: every prize "not won" (D34).
  const empty = await openShow(page.request, 6, 3);
  for (const step of ['close', 'seal', 'start']) {
    expect((await page.request.post(`/api/shows/${empty}/${step}`, OWN_PAGE)).ok()).toBe(true);
  }
  // The page's clock is held, so the ceremony stays on its first prize (one every 2.5 s) for all
  // fourteen pictures; without it the run outlasts the ceremony.
  await page.clock.install();
  await page.goto('/show');
  await page.getByRole('button', { name: 'Begin' }).click();
  await bar.getByRole('button', { name: 'End show' }).click();
  await bar.getByRole('button', { name: 'End now' }).click();
  const ceremony = page.getByRole('region', { name: 'The winners' });
  await expect(ceremony.getByRole('status')).toContainText('not won');
  // Paused just after the page's own now: no timer is due yet (the next prize comes after 2.5 s),
  // so nothing moves on. 250 ms, not 10: on a loaded machine more passes between the read and the
  // pause, and a pause in the past is refused.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 250);
  await shoot(page, 'ceremony', { themed: setThemeHeld });
  // The sweep waits for painted frames, which a held clock never gives: the ceremony runs on
  // from here, and is walked as it stands then.
  await page.clock.resume();
  await walk(page, 'ceremony');

  // The admin area with the settings (a development admin needs no second factor).
  await signInApi(page.request, 'Ada', 'admin');
  await page.goto('/admin');
  const settings = page.getByRole('form', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await shoot(page, 'admin-settings', { scrollTo: settings });
  await walk(page, 'admin-settings', async (at) => {
    await at.goto('/admin');
    await expect(settings).toBeVisible();
  });
  // The header in each role: signed out is the sign-in, a player the start; these two beside them.
  for (const [name, role] of [
    ['Ada', 'admin'],
    ['Mia', 'organiser'],
  ] as const) {
    await signInApi(page.request, name, role);
    await page.goto('/');
    await expect(page.getByTestId('app-header')).toBeVisible();
    await shoot(page, `header-${role}`);
    await walk(page, `header-${role}`, async (at) => {
      await at.goto('/');
      await expect(at.getByTestId('app-header')).toBeVisible();
    });
  }

  expect(findings).toEqual([]);
});
