/**
 * @file   e2e/journey6.spec.ts
 * @brief  Journey 6: a standalone admin sets up two-factor sign-in and signs in with it.
 *
 * Signs in as the browser project's seeded admin (./rootAdmin.ts) with the password only; the admin area asks for
 * two-factor sign-in before the accounts. The test reads the key from the page, makes the codes
 * an authenticator app would (the kit's `hotp`), confirms, keeps one recovery code, then signs in
 * again with the password and a TOTP code, and once more with the recovery code, then makes new
 * recovery codes in the admin area with the password and a code (D35). The admin's
 * second factor lives in the e2e server's memory, so each project has an admin of its own
 * and the journey runs once per project and server start.
 */
import { expect, test, type Page } from '@playwright/test';
import { base32Decode, hotp, stepAt } from '@seasonal/kit/server';

import { openMenu } from './helpers.js';
import { rootFor, type RootAdmin } from './rootAdmin.js';

// A TOTP code's step, and the least of it that must be left before the first code is used.
const STEP_MS = 30_000;
const STEP_ROOM_MS = 10_000;

async function signIn(page: Page, admin: RootAdmin, code?: string): Promise<void> {
  await page.goto('/');
  const form = page.getByRole('form', { name: 'Sign in' });
  await form.getByLabel('Name or e-mail').fill(admin.name);
  await form.getByLabel('Password').fill(admin.password);
  await form.getByRole('button', { name: 'Sign in' }).click();
  if (code === undefined) return;
  await form.getByLabel('Code').fill(code);
  await form.getByRole('button', { name: 'Sign in' }).click();
}

test('journey 6: an admin sets up two-factor sign-in, then signs in with a code and a recovery code', async ({
  page,
}) => {
  // This project's own admin: a run of several projects shares one e2e server (BACKLOG 40).
  const ROOT = rootFor(test.info().project.name);
  await signIn(page, ROOT);
  await expect(page.getByTestId('signed-in-as')).toContainText(ROOT.name);
  await openMenu(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admin' }).click();
  const setup = page.getByRole('region', { name: 'Two-factor sign-in' });
  await expect(page.getByRole('region', { name: 'Accounts' })).toHaveCount(0);
  await setup.getByRole('button', { name: 'Set up' }).click();

  const key = (await setup.locator('.two-factor-secret').textContent()) ?? '';
  const secret = base32Decode(key);
  if (secret === null) throw new Error(`not a base32 key: ${key}`);
  // The server takes the step now and one either side, each once: confirm, sign in and re-issue
  // use one each, which holds only while the step does not turn right under the first of them. So
  // a run that starts late in a step waits for the next one, whatever the time of the run.
  const left = STEP_MS - (Date.now() % STEP_MS);
  if (left < STEP_ROOM_MS) await page.waitForTimeout(left);
  const step = stepAt(Date.now());
  await setup.getByLabel('Code').fill(hotp(secret, step - 1));
  await setup.getByRole('button', { name: 'Confirm' }).click();

  const codes = page.getByRole('region', { name: 'Recovery codes' });
  await expect(codes.locator('code')).toHaveCount(10);
  const recovery = (await codes.locator('code').nth(2).textContent()) ?? '';
  await codes.getByRole('button', { name: 'I have saved them' }).click();
  await expect(page.getByRole('region', { name: 'Accounts' })).toContainText(ROOT.name);

  await openMenu(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await signIn(page, ROOT, hotp(secret, step));
  await expect(page.getByTestId('signed-in-as')).toContainText(ROOT.name);

  await openMenu(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await signIn(page, ROOT, recovery);
  await expect(page.getByTestId('signed-in-as')).toContainText(ROOT.name);

  // New recovery codes in the admin area: the password and a current code (D35).
  await openMenu(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admin' }).click();
  const reissue = page.getByRole('form', { name: 'New recovery codes' });
  await reissue.getByLabel('Password').fill(ROOT.password);
  await reissue.getByLabel('Code').fill(hotp(secret, step + 1));
  await reissue.getByRole('button', { name: 'Make new codes' }).click();
  const fresh = page.getByRole('region', { name: 'Recovery codes' });
  await expect(fresh.locator('code')).toHaveCount(10);
  await expect(fresh.locator('code').first()).not.toHaveText(recovery);
  await fresh.getByRole('button', { name: 'I have saved them' }).click();
  await openMenu(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
});
