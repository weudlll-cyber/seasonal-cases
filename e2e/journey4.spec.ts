/**
 * @file   e2e/journey4.spec.ts
 * @brief  Journey 4: website mode behind the stand-in website (GAME-INTEGRATION §2–§5, §8).
 *
 * Responsibility: an organiser member (may host) signs in through the website and opens a show;
 *                 a member signs in the same way, sees the back link, the docked chat frame and
 *                 their step badge, and may pick a case; a guest sees the same show with the
 *                 back link and a "Sign in" through the website, and no case to pick.
 * Depends on:     @playwright/test, ./helpers.ts, ./stubShared.ts
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { endEarly } from './helpers.js';
import { STEP_ICON, STUB_ORIGIN } from './stubShared.js';

const GAME = `${STUB_ORIGIN}/games/cases/`;

/** Signs in through the website: the header's link, the website's login, and back. */
async function signInThroughWebsite(context: BrowserContext, memberId: number): Promise<Page> {
  await context.addCookies([{ name: 'stub-as', value: String(memberId), url: STUB_ORIGIN }]);
  const page = await context.newPage();
  await page.goto(GAME);
  await page.getByRole('link', { name: 'Sign in' }).click();
  await expect(page.locator('.shell-me')).toBeVisible();
  return page;
}

test('journey 4: website sign-in, back link, docked chat, badges; a guest only watches', async ({
  browser,
}) => {
  const host = await browser.newContext();
  const olga = await signInThroughWebsite(host, 8);
  await expect(olga.locator('.shell-me')).toContainText('organiser');
  const api = olga.request;
  const created = await api.post(`${GAME}api/shows`, {
    data: { cases: 6, winners: 1, labels: [] },
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()) as { id: string };
  expect((await api.post(`${GAME}api/shows/${id}/open`)).ok()).toBe(true);

  const member = await browser.newContext();
  const ana = await signInThroughWebsite(member, 7);
  await expect(ana).toHaveURL(GAME);
  await expect(ana.getByRole('link', { name: '← Seasonal Entertainment' })).toHaveAttribute(
    'href',
    '/games',
  );
  await expect(ana.locator('.shell-me .badge-icon')).toHaveAttribute('src', STEP_ICON);
  const chat = ana.getByTestId('chat-frame');
  await expect(chat).toHaveAttribute('src', /^\/embed\/chat\?room=cases&theme=/);
  // On a phone the kit's dock is a folded bar: open it to see the chat, fold it to play on.
  const chatBar = ana.getByTestId('chat-bar');
  const phone = await chatBar.isVisible();
  if (phone) await chatBar.click();
  await expect(
    ana.frameLocator('[data-testid="chat-frame"]').getByText('Chat (stand-in)'),
  ).toBeVisible();
  if (phone) {
    await chatBar.click();
    await expect(chatBar).toHaveAttribute('aria-expanded', 'false');
  }
  await ana.locator('.board-case[data-case="3"]').getByRole('button').click();
  await expect(ana.locator('.board-pick')).toContainText('Your pick: case 3, you hold it');
  await expect(ana.locator('.board-case[data-case="3"] .badge-icon')).toBeVisible();

  const guest = await browser.newContext();
  const watcher = await guest.newPage();
  await watcher.goto(GAME);
  await expect(watcher.getByRole('link', { name: '← Seasonal Entertainment' })).toBeVisible();
  await expect(watcher.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(watcher.locator('.board-case[data-case="3"]')).toContainText('Ana');
  await expect(watcher.locator('.board-case button')).toHaveCount(0);
  await expect(watcher.getByRole('form', { name: 'Development sign-in' })).toHaveCount(0);

  for (const step of ['close', 'seal', 'start']) {
    expect((await api.post(`${GAME}api/shows/${id}/${step}`)).ok()).toBe(true);
  }
  await watcher.goto(`${GAME}show`);
  await expect(watcher.getByRole('region', { name: 'Opening' })).toBeVisible();
  await expect(watcher.getByRole('button', { name: 'Begin' })).toHaveCount(0);

  // The organiser holds the direction in website mode too; ending the show leaves no live show
  // behind for the next journey.
  await olga.goto(`${GAME}show`);
  await olga.getByRole('button', { name: 'Begin' }).click();
  await endEarly(olga, 1);
  await expect(watcher.getByRole('region', { name: 'The winners' })).toBeVisible();
  for (const c of [host, member, guest]) await c.close();
});
