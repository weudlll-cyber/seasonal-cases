/**
 * @file   e2e/journey4.spec.ts
 * @brief  Journey 4: website mode behind the stand-in website (GAME-INTEGRATION §2–§5, §8).
 *
 * Responsibility: an organiser member (may host) signs in through the website and opens a show;
 *                 a member signs in the same way, sees the back link, the docked chat frame and
 *                 their step badge, and may pick a case; a guest sees the same show with the
 *                 back link and a "Sign in" through the website, and no case to pick. On the
 *                 result the website's shared call shows only while it is live, with "Back to
 *                 the call" (D91).
 * Depends on:     @playwright/test, ./helpers.ts, ./standIn.ts, ./stubShared.ts
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { endEarly, openMenu, OWN_PAGE } from './helpers.js';
import { gameAt, startSite, type WebsiteStandIn } from './standIn.js';
import { STEP_ICON } from './stubShared.js';

let site: WebsiteStandIn;
let GAME = '';
test.beforeAll(async () => {
  site = await startSite();
  GAME = gameAt(site);
});
test.afterAll(async () => {
  await site.close();
});

/** Signs in through the website: the header's link, the website's login, and back. */
async function signInThroughWebsite(context: BrowserContext, memberId: number): Promise<Page> {
  site.signInAs(memberId);
  const page = await context.newPage();
  await page.goto(GAME);
  await openMenu(page);
  await page.getByRole('link', { name: 'Sign in' }).click();
  // On a phone the chip sits in the folded menu: attached, not visible.
  await expect(page.getByTestId('signed-in-as')).toBeAttached();
  return page;
}

/** The kit's browser check of the shared call (CHANGELOG v0.37.0): nothing until it is live. */
async function sharedCallOnTheResult(page: Page, result: string): Promise<void> {
  await page.goto(result);
  await expect(page.locator('.result-seal')).toContainText('verified');
  const slot = page.getByTestId('shared-call-slot');
  const back = page.getByTestId('back-to-call');
  const view = page.frameLocator('[data-testid="shared-call-frame"]');
  await expect(view.getByText('call (stand-in)')).toBeAttached();
  await expect(slot).toBeHidden();
  await expect(back).toHaveCount(0);
  const say = (type: string, fields: object) =>
    view.locator('body').evaluate(
      (_body, [kind, more]) => {
        (window as unknown as { say: (k: unknown, m: unknown) => void }).say(kind, more);
      },
      [type, fields] as const,
    );
  await say('ready', { call: 7, status: 'live', signedIn: true });
  await expect(slot).toBeVisible();
  await expect(back).toHaveAttribute('href', '/calls/7');
  await say('ended', { reason: 'unshared' });
  await expect(slot).toBeHidden();
  await expect(back).toHaveCount(0);
}

test('journey 4: website sign-in, back link, docked chat, badges; a guest only watches', async ({
  browser,
}) => {
  const host = await browser.newContext();
  const olga = await signInThroughWebsite(host, 8);
  await expect(olga.getByTestId('signed-in-as')).toContainText('organiser');
  const api = olga.request;
  const created = await api.post(`${GAME}api/shows`, {
    data: { cases: 6, winners: 1, labels: [] },
    ...OWN_PAGE,
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()) as { id: string };
  expect((await api.post(`${GAME}api/shows/${id}/open`, OWN_PAGE)).ok()).toBe(true);

  const member = await browser.newContext();
  const ana = await signInThroughWebsite(member, 7);
  await expect(ana).toHaveURL(GAME);
  await expect(
    ana.getByRole('link', { name: 'Seasonal Entertainment', exact: true }),
  ).toHaveAttribute('href', '/games');
  const chat = ana.getByTestId('chat-frame');
  await expect(chat).toHaveAttribute('src', /^\/embed\/chat\?room=cases&theme=/);
  // On a phone the kit's dock is a folded bar: open it to see the chat, fold it to play on.
  const chatBar = ana.getByTestId('chat-bar');
  const phone = await chatBar.isVisible();
  if (phone) await chatBar.click();
  await expect(
    ana.frameLocator('[data-testid="chat-frame"]').getByText('chat (stand-in)'),
  ).toBeVisible();
  if (phone) {
    await chatBar.click();
    await expect(chatBar).toHaveAttribute('aria-expanded', 'false');
  }
  await ana.locator('.board-case[data-case="3"]').getByRole('button').click();
  await expect(ana.locator('.board-pick')).toContainText('Your pick: case 3, you hold it');
  // The website's step icon reaches the page: beside the holder's name on the board.
  await expect(ana.locator('.board-case[data-case="3"] .sk-step')).toHaveAttribute(
    'src',
    STEP_ICON,
  );

  const guest = await browser.newContext();
  const watcher = await guest.newPage();
  await watcher.goto(GAME);
  await expect(
    watcher.getByRole('link', { name: 'Seasonal Entertainment', exact: true }),
  ).toBeVisible();
  await openMenu(watcher);
  await expect(watcher.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(watcher.locator('.board-case[data-case="3"]')).toContainText('Ana');
  await expect(watcher.locator('.board-case button')).toHaveCount(0);
  await expect(watcher.getByRole('form', { name: 'Development sign-in' })).toHaveCount(0);

  for (const step of ['close', 'seal', 'start']) {
    expect((await api.post(`${GAME}api/shows/${id}/${step}`, OWN_PAGE)).ok()).toBe(true);
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
  await sharedCallOnTheResult(watcher, `${GAME}results/${id}`);
  for (const c of [host, member, guest]) await c.close();
});
