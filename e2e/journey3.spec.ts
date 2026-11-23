/**
 * @file   e2e/journey3.spec.ts
 * @brief  Journey 3: a player's socket never receives unopened content, and the commitment
 *         shown before the show equals the one on the result screen (CONCEPT §8).
 *
 * Responsibility: record every socket frame a player's page receives while an organiser opens
 *                 two cases and ends the show; no public view in it holds the content of an
 *                 unopened case, the assignment or the secret. Read the commitment on the
 *                 registration board after sealing and compare it with the result's.
 */
import { expect, test, type WebSocket } from '@playwright/test';

import { direct, endEarly, quickTestSealing, signInApi, signInUi } from './helpers.js';

// The direction bar's buttons and the step the player's stage shows after each.
const STEPS = [
  ['Open', 'open'],
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
  await signInApi(mod.request, 'Mia', 'organiser');
  const created = await mod.request.post('/api/dev/quick-test', {
    data: { cases: 8, winners: 2, labels: [], seed: SEED },
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()) as { id: string };

  // Before the first case: the commitment on the scoreboard during the opening.
  await page.goto('/show');
  await expect(page.getByRole('region', { name: 'Opening' })).toBeVisible();
  const shown = await page.locator('.stage-commitment').getAttribute('title');
  const before = shown?.replace('Commitment ', '');
  expect(before).toMatch(/^[0-9a-f]{64}$/);

  await mod.goto('/show');
  await mod.getByRole('button', { name: 'Begin' }).click();
  for (const caseNumber of [sealing.get('prize-1'), sealing.get('blank-1')]) {
    await mod.locator(`.case-token[data-case="${String(caseNumber)}"] button`).click();
    for (const [label, step] of STEPS) {
      await direct(mod, (bar) => bar.getByRole('button', { name: label }).click());
      await expect(page.locator('.stage-screen')).toHaveAttribute('data-step', step);
    }
  }
  await expect(page.locator('.case-token.is-opened')).toHaveCount(2);
  const beforeEnd = frames.filter(([event]) => event === 'show:public');

  // Prize 2 is still hidden: the end asks first (DECISIONS D33).
  await endEarly(mod, 1);
  await page.goto(`/results/${id}`);
  const seal = page.locator('.result-seal');
  await expect(seal).toContainText('· verified');
  const after = await seal.locator('.commitment').getAttribute('data-commitment');
  expect(after).toBe(before);
  const secret = /secret ([0-9a-f]{64})$/.exec((await seal.getAttribute('title')) ?? '')?.[1];
  expect(secret).toBeDefined();

  // Every public view before the end: no secret, no assignment, no unopened content.
  expect(beforeEnd.length).toBeGreaterThan(10);
  expect(frames.some(([event]) => event === 'show:organiser')).toBe(false);
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
