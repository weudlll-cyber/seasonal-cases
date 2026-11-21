/**
 * @file   e2e/journey3.spec.ts
 * @brief  Journey 3: a player's socket never receives unopened content, and the commitment
 *         shown before the show equals the one on the result screen (CONCEPT §8).
 *
 * Responsibility: record every socket frame a player's page receives while a moderator opens
 *                 two cases and ends the show; no public view in it holds the content of an
 *                 unopened case, the assignment or the secret. Read the commitment on the
 *                 registration board after sealing and compare it with the result's.
 */
import { expect, test, type WebSocket } from '@playwright/test';

import { quickTestSealing, signInApi, signInUi } from './helpers.js';

// The direction bar's buttons and the step the player's stage shows after each.
const STEPS = [
  ['Tension', 'tension'],
  ['Open', 'open'],
  ['Prize', 'prize'],
  ['Owner', 'owner'],
  ['Back to stage', 'idle'],
] as const;

interface CaseFrame {
  number: number;
  opened: boolean;
  artifact: unknown;
}

/** The payloads of socket.io event frames ("42[...]") a socket received. */
function record(ws: WebSocket, into: unknown[][]): void {
  ws.on('framereceived', ({ payload }) => {
    const text = typeof payload === 'string' ? payload : payload.toString('utf8');
    const match = /^42(\[.*\])$/s.exec(text);
    if (match?.[1] !== undefined) into.push(JSON.parse(match[1]) as unknown[]);
  });
}

test('journey 3: no unopened content reaches a player; the commitment holds', async ({
  page,
  browser,
}) => {
  const SEED = 'sc-n1-03';
  const sealing = quickTestSealing(SEED, 8, 2);
  const frames: unknown[][] = [];
  page.on('websocket', (ws) => {
    record(ws, frames);
  });
  await signInUi(page, 'Pia', 'player', 1);

  const modContext = await browser.newContext();
  const mod = await modContext.newPage();
  await mod.goto('/');
  await signInApi(mod.request, 'Mia', 'moderator');
  const created = await mod.request.post('/api/dev/quick-test', {
    data: { cases: 8, winners: 2, labels: [], seed: SEED },
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()) as { id: string };

  // Before the show: the commitment on the lobby's artifact table.
  await page.goto('/');
  const before = await page
    .locator('.artifact-commitment .commitment')
    .getAttribute('data-commitment');
  expect(before).toMatch(/^[0-9a-f]{64}$/);
  await page.goto('/show');
  await expect(page.locator('.stage-screen')).toBeVisible();

  await mod.goto('/show');
  const bar = mod.getByRole('navigation', { name: 'Direction' });
  for (const caseNumber of [sealing.get('prize-1'), sealing.get('blank-1')]) {
    await mod.locator(`.case-token[data-case="${String(caseNumber)}"] button`).click();
    for (const [label, step] of STEPS) {
      await bar.getByRole('button', { name: label }).click();
      await expect(page.locator('.stage-screen')).toHaveAttribute('data-step', step);
    }
  }
  await expect(page.locator('.case-token.is-opened')).toHaveCount(2);
  const beforeEnd = frames.filter(([event]) => event === 'show:public');

  await bar.getByRole('button', { name: 'End show' }).click();
  await page.goto(`/results/${id}`);
  const seal = page.locator('.result-seal');
  await expect(seal).toContainText('· verified');
  const after = await seal.locator('.commitment').getAttribute('data-commitment');
  expect(after).toBe(before);
  const secret = /secret ([0-9a-f]{64})$/.exec((await seal.getAttribute('title')) ?? '')?.[1];
  expect(secret).toBeDefined();

  // Every public view before the end: no secret, no assignment, no unopened content.
  expect(beforeEnd.length).toBeGreaterThan(10);
  expect(frames.some(([event]) => event === 'show:moderator')).toBe(false);
  for (const [, view] of beforeEnd) {
    const text = JSON.stringify(view);
    expect(text).not.toContain(secret ?? 'no secret on the result');
    expect(text).not.toContain('assignment');
    for (const c of (view as { cases: CaseFrame[] }).cases) {
      if (!c.opened) expect(c.artifact).toBeNull();
    }
  }
  await modContext.close();
});
