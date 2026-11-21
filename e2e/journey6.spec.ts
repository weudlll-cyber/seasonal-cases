/**
 * @file   e2e/journey6.spec.ts
 * @brief  Journey 6: a standalone admin sets up two-factor sign-in and signs in with it.
 *
 * Signs in as the seeded admin (./rootAdmin.ts) with the password only; the admin area asks for
 * two-factor sign-in before the accounts. The test reads the key from the page, makes the codes
 * an authenticator app would (the kit's `hotp`), confirms, keeps one recovery code, then signs in
 * again with the password and a TOTP code, and once more with the recovery code. The admin's
 * second factor lives in the e2e server's memory, so the journey runs once per server start.
 */
import { expect, test, type Page } from '@playwright/test';
import { base32Decode, hotp, stepAt } from '@seasonal/kit/server';

import { ROOT } from './rootAdmin.js';

async function signIn(page: Page, code?: string): Promise<void> {
  await page.goto('/');
  const form = page.getByRole('form', { name: 'Sign in' });
  await form.getByLabel('Name or e-mail').fill(ROOT.name);
  await form.getByLabel('Password').fill(ROOT.password);
  await form.getByRole('button', { name: 'Sign in' }).click();
  if (code === undefined) return;
  await form.getByLabel('Code').fill(code);
  await form.getByRole('button', { name: 'Sign in' }).click();
}

test('journey 6: an admin sets up two-factor sign-in, then signs in with a code and a recovery code', async ({
  page,
}) => {
  await signIn(page);
  await expect(page.locator('.shell-me')).toContainText(ROOT.name);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admin' }).click();
  const setup = page.getByRole('region', { name: 'Two-factor sign-in' });
  await expect(page.getByRole('region', { name: 'Accounts' })).toHaveCount(0);
  await setup.getByRole('button', { name: 'Set up' }).click();

  const key = (await setup.locator('.two-factor-secret').textContent()) ?? '';
  const secret = base32Decode(key);
  if (secret === null) throw new Error(`not a base32 key: ${key}`);
  const step = stepAt(Date.now());
  await setup.getByLabel('Code').fill(hotp(secret, step));
  await setup.getByRole('button', { name: 'Confirm' }).click();

  const codes = page.getByRole('region', { name: 'Recovery codes' });
  await expect(codes.locator('code')).toHaveCount(10);
  const recovery = (await codes.locator('code').nth(2).textContent()) ?? '';
  await codes.getByRole('button', { name: 'I have saved them' }).click();
  await expect(page.getByRole('region', { name: 'Accounts' })).toContainText(ROOT.name);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await signIn(page, hotp(secret, step + 1));
  await expect(page.locator('.shell-me')).toContainText(ROOT.name);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await signIn(page, recovery);
  await expect(page.locator('.shell-me')).toContainText(ROOT.name);
  await page.getByRole('button', { name: 'Sign out' }).click();
});
