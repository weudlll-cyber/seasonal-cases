/**
 * @file   e2e/helpers.ts
 * @brief  The journeys' shared steps: signing in, setting up shows, and knowing a seed's sealing.
 *
 * Responsibility: sign in through the UI or the dev route; create and open shows through the dev
 *                 admin API; and learn which case holds which artifact for a Quick Test seed by
 *                 running the same Quick Test in memory: the seed reproduces the sealing
 *                 (CONCEPT §8), so the test can aim at the main prize without reading anything
 *                 the client receives; act on the direction bar on a desktop or a phone; open the
 *                 kit header's folded menu on a phone.
 * Depends on:     @playwright/test, @sc/application, @sc/domain
 */
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { createShowService, memoryStore } from '@sc/application';
import { seededRandom } from '@sc/domain';

export type Role = 'player' | 'organiser' | 'admin';

/** Signs in through the lobby's development sign-in form. */
export async function signInUi(page: Page, name: string, role: Role, rank = 0): Promise<void> {
  await page.goto('/');
  const form = page.getByRole('form', { name: 'Development sign-in' });
  await form.getByLabel('Name').fill(name);
  await form.getByLabel('Role').selectOption(role);
  await form.getByLabel('Rank').selectOption(String(rank));
  await form.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('signed-in-as')).toContainText(name);
}

/**
 * On a phone the kit folds the header's pages and account into its "Menu" button: opens it where
 * it is closed, so the links and "Sign out" in it can be clicked. A header that is not folded has
 * no such button visible, and nothing happens.
 */
export async function openMenu(page: Page): Promise<void> {
  await expect(page.getByTestId('app-header')).toBeVisible();
  const menu = page.getByTestId('menu-button');
  if ((await menu.isVisible()) && (await menu.getAttribute('aria-expanded')) === 'false') {
    await menu.click();
  }
}

/** Signs in through the dev route; the page's context keeps the cookie. */
export async function signInApi(request: APIRequestContext, name: string, role: Role, rank = 0) {
  const response = await request.post('/api/dev/sign-in', { data: { name, role, rank } });
  expect(response.ok()).toBe(true);
}

/** Creates a show and opens its registration; returns its id. */
export async function openShow(request: APIRequestContext, cases: number, winners: number) {
  const created = await request.post('/api/shows', { data: { cases, winners, labels: [] } });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()) as { id: string };
  expect((await request.post(`/api/shows/${id}/open`)).ok()).toBe(true);
  return id;
}

/** Case number → sealed artifact id of a Quick Test with this seed and setup. */
export function quickTestSealing(
  seed: string,
  cases: number,
  winners: number,
): Map<string, number> {
  let tick = 0;
  const shows = createShowService({
    clock: { now: () => new Date(Date.UTC(2026, 10, 21, 20, 0, tick++)).toISOString() },
    ids: { showId: () => 'replay' },
    random: {
      secure: () => {
        throw new Error('the replay uses the seed only');
      },
      seeded: seededRandom,
    },
    store: memoryStore(),
  });
  const outcome = shows.quickTest(
    { cases, winners, labels: [], seed },
    { id: 'replay', name: 'replay' },
  );
  if (!outcome.ok) throw new Error(outcome.error);
  const byArtifact = new Map<string, number>();
  for (const e of outcome.model.sealing?.assignment ?? [])
    byArtifact.set(e.artifactId, e.caseNumber);
  return byArtifact;
}

/** The case card on the registration board. */
export const boardCase = (page: Page, n: number) =>
  page.locator(`.board-case[data-case="${String(n)}"]`);

/**
 * Acts on the direction bar wherever the layout puts it: under the stage on a desktop, in the
 * game bar's "Direction" panel on a phone (SC-N2 piece 3). On a phone the panel opens for the
 * action and closes after it, so the stage's cases can be clicked again (the panel lies over
 * the stage). After an action that ends the direction (a hand-over, the end) there is no
 * panel left to close.
 */
export async function direct(page: Page, act: (bar: Locator) => Promise<void>): Promise<void> {
  const inline = page.locator('.stage-screen').getByRole('navigation', { name: 'Direction' });
  const toggle = page.getByRole('button', { name: 'Direction', exact: true });
  await expect(inline.or(toggle)).toBeVisible();
  if (await inline.isVisible()) {
    await act(inline);
    return;
  }
  await toggle.click();
  const panel = page.getByRole('complementary', { name: 'direction' });
  await act(panel.getByRole('navigation', { name: 'Direction' }));
  // Escape closes the open panel (apps/web/src/shell/FocusBar.tsx), as a keyboard user would.
  if (await panel.isVisible()) await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
}

/**
 * Ends a show with prizes still hidden: "End show" asks first, naming how many (DECISIONS D33),
 * and "End now" ends it. `hidden` is the number the question must name.
 */
export async function endEarly(page: Page, hidden: number): Promise<void> {
  await direct(page, async (bar) => {
    await bar.getByRole('button', { name: 'End show' }).click();
    const question = bar.getByRole('group', { name: 'End the show early?' });
    const words = hidden === 1 ? '1 prize is' : `${String(hidden)} prizes are`;
    await expect(question).toContainText(`${words} still hidden`);
    await question.getByRole('button', { name: 'End now' }).click();
  });
}

/** Deletes the mails Mailpit holds for this address (its API on 127.0.0.1:8570). */
export async function deleteMailTo(page: Page, to: string): Promise<void> {
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
