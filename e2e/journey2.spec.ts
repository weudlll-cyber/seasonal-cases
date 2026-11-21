/**
 * @file   e2e/journey2.spec.ts
 * @brief  Journey 2: case conflicts decided by rank, then by the earlier pick (CONCEPT §3.2).
 *
 * Responsibility: two players claim case 7; the higher rank holds it; the lower one sees the
 *                 hint and re-picks case 8; with equal ranks the earlier claim holds. After the
 *                 close, each owns their case and the third player has none.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { boardCase, openShow, signInApi, signInUi } from './helpers.js';

async function player(browser: Browser, name: string, rank: number): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInUi(page, name, 'player', rank);
  return page;
}

test('journey 2: the higher rank holds, the lower re-picks, the earlier of equals holds', async ({
  page,
  browser,
}) => {
  // The organiser opens a fresh show; the lobby shows the newest show that has not ended.
  await page.goto('/');
  await signInApi(page.request, 'Ada', 'admin');
  const id = await openShow(page.request, 12, 3);

  const lena = await player(browser, 'Lena', 2);
  await expect(lena.locator('.start-badge')).toHaveText('Registration open');
  await boardCase(lena, 7).getByRole('button').click();
  await expect(lena.locator('.board-pick')).toContainText('Your pick: case 7, you hold it');

  const hugo = await player(browser, 'Hugo', 4);
  await boardCase(hugo, 7).getByRole('button').click();
  await expect(hugo.locator('.board-pick')).toContainText('you hold it');

  // Lena (rank 2) lost case 7 to Hugo (rank 4): the hint and the pick line say so.
  await expect(boardCase(lena, 7)).toContainText('Hugo');
  await expect(boardCase(lena, 7)).toContainText('Your rank is lower: the holder keeps it');
  await expect(lena.locator('.board-pick')).toContainText('someone with a higher rank');
  await boardCase(lena, 8).getByRole('button').click();
  await expect(lena.locator('.board-pick')).toContainText('Your pick: case 8, you hold it');

  // Ivy has Hugo's rank but picks later: the earlier claim holds.
  const ivy = await player(browser, 'Ivy', 4);
  await expect(boardCase(ivy, 7)).toContainText('Equal rank: the earlier pick holds');
  await boardCase(ivy, 7).getByRole('button').click();
  await expect(ivy.locator('.board-pick')).toContainText(
    'someone with a higher rank or an earlier pick',
  );
  await expect(boardCase(ivy, 7)).toContainText('also: Ivy (rank 4');

  expect((await page.request.post(`/api/dev/shows/${id}/close`)).ok()).toBe(true);
  await expect(boardCase(lena, 7)).toContainText('Hugo');
  await expect(boardCase(lena, 8)).toContainText('Lena');
  await expect(lena.locator('.board-screen h2')).toHaveText('The cases and their owners');
  await expect(lena.locator('.start-badge')).toHaveText('Registration closed');
  const view = (await (await page.request.get(`/api/shows/${id}`)).json()) as {
    cases: { number: number; ownerName: string | null }[];
  };
  const owners = view.cases.filter((c) => c.ownerName !== null).map((c) => [c.number, c.ownerName]);
  expect(owners).toEqual([
    [7, 'Hugo'],
    [8, 'Lena'],
  ]);
  for (const p of [lena, hugo, ivy]) await p.context().close();
});
