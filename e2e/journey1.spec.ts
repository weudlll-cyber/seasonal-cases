/**
 * @file   e2e/journey1.spec.ts
 * @brief  Journey 1: a Quick Test show from the admin to the verified result, with a hand-over.
 *
 * Responsibility: an admin signs in and runs Quick Test (N = 12, W = 3, seed `sc-n1-01`); the
 *                 same user holds the direction and opens four cases through the click and the
 *                 three steps (a blank and the main prize among them), the scoreboard striking
 *                 each prize through once its case is back; hands over to a second organiser in a
 *                 second browser context, who ends the show; the result verifies. Each step is
 *                 asserted as visible; the lower third shows the owner. Then a real show of two
 *                 cases nobody claims (no bots, D34): a case opens through the three steps as
 *                 "Unclaimed", and its prize is "not won" in the ceremony and the result.
 */
import { expect, test, type Page } from '@playwright/test';

import { direct, endEarly, openShow, quickTestSealing, signInUi, OWN_PAGE } from './helpers.js';

const SEED = 'sc-n1-01';
const STEPS = ['Open', 'Owner', 'Back to stage'] as const;

async function revealCase(page: Page, caseNumber: number): Promise<void> {
  const stage = page.locator('.stage-screen');
  const place = page.locator(`.case-token[data-case="${String(caseNumber)}"] .case-body`);
  const owner = await place.locator('.case-owner').innerText();
  const atPlace = await place.boundingBox();
  await place.click();
  await expect(stage).toHaveAttribute('data-step', 'selected');
  const front = page.locator(`.centre-case[data-case="${String(caseNumber)}"]`);
  await expect(front.locator('.cp-number')).toHaveText(String(caseNumber));
  // The case travelled from its place to the front, and shows nothing before "Open".
  await page.waitForTimeout(900);
  const atFront = await front.boundingBox();
  expect(atPlace).not.toBeNull();
  expect(atFront).not.toBeNull();
  if (atPlace !== null && atFront !== null) {
    const moved = Math.hypot(atFront.x - atPlace.x, atFront.y - atPlace.y);
    expect(moved).toBeGreaterThan(20);
    expect(atFront.width).toBeGreaterThan(atPlace.width);
  }
  await expect(page.locator('.centre .artifact')).toHaveCount(0);
  await expect(page.locator('.centre-meaning')).toHaveCount(0);
  for (const label of STEPS) {
    await direct(page, (bar) => bar.getByRole('button', { name: label }).click());
    if (label === 'Open') {
      await expect(page.locator('.centre .artifact')).toBeVisible();
      await expect(page.locator('.centre-meaning')).toBeVisible();
    }
    if (label === 'Owner') {
      await expect(page.locator('.lower-third')).toBeVisible();
      await expect(page.locator('.lower-third-name')).toHaveText(owner);
    }
  }
  await expect(stage).toHaveAttribute('data-step', 'idle');
  await expect(page.locator(`.case-token[data-case="${String(caseNumber)}"]`)).toHaveClass(
    /is-opened/,
  );
}

test('journey 1: Quick Test, four cases through the three steps, hand-over, verified result', async ({
  page,
  browser,
}) => {
  // Two shows in one journey (the Quick Test, then the unclaimed show): three times the time.
  test.slow();
  const sealing = quickTestSealing(SEED, 12, 3);
  const main = sealing.get('prize-1');
  const blank = sealing.get('blank-1');
  const second = sealing.get('prize-2');
  const third = sealing.get('prize-3');
  if (main === undefined || blank === undefined || second === undefined || third === undefined) {
    throw new Error('the replayed sealing is incomplete');
  }

  await signInUi(page, 'Ada', 'admin');
  await page.goto('/admin');
  const setup = page.getByRole('form', { name: 'Show setup' });
  await setup.getByLabel('Cases (N)').fill('12');
  await setup.getByLabel('Winners (W)').fill('3');
  await setup.getByLabel('Quick Test seed').fill(SEED);
  await setup.getByRole('button', { name: 'Quick Test' }).click();
  await expect(page).toHaveURL(/\/show$/);
  // The opening: everyone sees it, only the holder begins.
  await expect(page.getByRole('region', { name: 'Opening' })).toBeVisible();
  await page.getByRole('button', { name: 'Begin' }).click();
  await direct(page, (bar) => expect(bar).toBeVisible());
  const commitment = await page.locator('.stage-commitment').getAttribute('title');

  await revealCase(page, blank);
  await expect(page.locator('.score-row.is-taken')).toHaveCount(0);
  await revealCase(page, main);
  await revealCase(page, second);
  await revealCase(page, third);
  await expect(page.locator('.score-row.is-taken')).toHaveCount(3);
  await direct(page, (bar) =>
    expect(bar.getByRole('button', { name: 'End show' })).toHaveClass(/is-ready/),
  );

  // A second organiser watches the stage in a second context; the direction goes to him.
  const other = await browser.newContext();
  const noah = await other.newPage();
  await signInUi(noah, 'Noah', 'organiser');
  await noah.goto('/show');
  await expect(noah.locator('.stage-screen')).toBeVisible();
  await expect(noah.getByRole('navigation', { name: 'Direction' })).toHaveCount(0);
  await direct(page, async (bar) => {
    await bar.getByLabel('Organiser to hand over to').selectOption({ label: 'Noah' });
    await bar.getByRole('button', { name: 'Hand over' }).click();
  });
  await expect(page.getByRole('navigation', { name: 'Direction' })).toHaveCount(0);
  await direct(noah, (bar) => bar.getByRole('button', { name: 'End show' }).click());
  // The ceremony: the winners one after another, the main prize last, then the way on.
  const ceremony = noah.getByRole('region', { name: 'The winners' });
  await expect(ceremony.getByRole('status')).toContainText(/Prize 3/);
  await expect(ceremony.getByRole('status')).toContainText(/Prize 1/, { timeout: 8000 });
  await ceremony.getByRole('link', { name: 'See the result' }).click();

  const seal = noah.locator('.result-seal');
  await expect(seal).toContainText('verified');
  await expect(seal).not.toContainText('NOT verified');
  expect(await noah.locator('.result-seal .commitment').getAttribute('data-commitment')).toBe(
    commitment?.replace('Commitment ', ''),
  );
  await expect(noah.locator('.result-winners li')).toHaveCount(3);
  await expect(noah.locator('.result-winners li').first()).toContainText('Halving Stone');
  await other.close();

  await unclaimedShow(page);
});

/**
 * A real show nobody claims a case in (DECISIONS D34): two cases, one prize, no bots. A case
 * opens like any other and says "Unclaimed" at the owner step; the prize is "not won" in the
 * ceremony and the result, wherever it lies.
 */
async function unclaimedShow(page: Page): Promise<void> {
  const id = await openShow(page.request, 2, 1);
  for (const step of ['close', 'seal', 'start']) {
    expect((await page.request.post(`/api/shows/${id}/${step}`, OWN_PAGE)).ok()).toBe(true);
  }
  await page.goto('/show');
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.getByLabel('Case 1, Unclaimed')).toBeVisible();
  await page.locator('.case-token[data-case="1"] .case-body').click();
  await direct(page, (bar) => bar.getByRole('button', { name: 'Open' }).click());
  const prizeFound = (await page.locator('.centre-meaning').innerText()) !== 'No prize';
  await direct(page, (bar) => bar.getByRole('button', { name: 'Owner' }).click());
  await expect(page.locator('.lower-third')).toHaveText('Case 1Unclaimed');
  await direct(page, (bar) => bar.getByRole('button', { name: 'Back to stage' }).click());
  if (prizeFound) {
    await expect(page.locator('.score-row.is-taken')).toContainText('not won');
    await direct(page, (bar) => bar.getByRole('button', { name: 'End show' }).click());
  } else {
    await endEarly(page, 1);
  }
  const ceremony = page.getByRole('region', { name: 'The winners' });
  await expect(ceremony.getByRole('status')).toContainText('not won');
  await ceremony.getByRole('link', { name: 'See the result' }).click();
  await expect(page.locator('.result-winners li')).toContainText('not won');
}
