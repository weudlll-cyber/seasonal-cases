/**
 * @file   e2e/helpers.ts
 * @brief  The journeys' shared steps: signing in, setting up shows, and knowing a seed's sealing.
 *
 * Responsibility: sign in through the UI or the dev route; create and open shows through the dev
 *                 admin API; and learn which case holds which artifact for a Quick Test seed by
 *                 running the same Quick Test in memory: the seed reproduces the sealing
 *                 (CONCEPT §8), so the test can aim at the main prize without reading anything
 *                 the client receives.
 * Depends on:     @playwright/test, @sc/application, @sc/domain
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';
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
  await expect(page.locator('.shell-me')).toContainText(name);
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
