/**
 * @file   e2e/journey5.spec.ts
 * @brief  Journey 5: a standalone account from registration to a new password (DECISIONS D24).
 *
 * Registers through the start page (nobody is signed in, D36), finds that the name cannot sign
 * in before the mail's confirmation link is used (D42), opens the link from Mailpit and confirms,
 * signs in by name, signs out, asks for a new password, takes the link from the mail in
 * Mailpit (its API on 127.0.0.1:8570), sets a new password, signs in with it by e-mail, and
 * opens "My matches". Both mails are deleted afterwards; the account lives in the e2e server's
 * memory and ends with it.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';

const MAILPIT = 'http://127.0.0.1:8570/api/v1';

interface Summary {
  readonly ID: string;
}

/** The newest mail to `to` with this subject, waiting until it has arrived. */
async function mailTo(
  request: APIRequestContext,
  to: string,
  subject: string,
): Promise<{ id: string; text: string }> {
  let id = '';
  const query = encodeURIComponent(`to:${to} subject:"${subject}"`);
  await expect
    .poll(async () => {
      const found = await request.get(`${MAILPIT}/search?query=${query}`);
      const { messages } = (await found.json()) as { messages: Summary[] };
      id = messages[0]?.ID ?? '';
      return id;
    })
    .not.toBe('');
  const message = await request.get(`${MAILPIT}/message/${id}`);
  const { Text } = (await message.json()) as { Text: string };
  return { id, text: Text };
}

test('journey 5: register, forget the password, reset it by mail, sign in again', async ({
  page,
  request,
}) => {
  // A fresh name and address per run, so a repeat never meets the last run's account or mail.
  const tag = String(Date.now());
  const name = `Ana${tag.slice(-6)}`;
  const email = `ana.${tag}@example.org`;
  await page.goto('/');

  const entry = page.getByRole('region', { name: 'Sign in' });
  await entry.getByRole('button', { name: 'Create an account' }).click();
  const register = page.getByRole('form', { name: 'Create an account' });
  await register.getByLabel('Name').fill(name);
  await register.getByLabel('E-mail').fill(email);
  await register.getByLabel('Password').fill('short');
  await register.getByRole('button', { name: 'Create account' }).click();
  await expect(register.getByRole('alert')).toHaveText(
    'The password needs at least 12 characters.',
  );
  await register.getByLabel('Password').fill('the first long password');
  await register.getByRole('button', { name: 'Create account' }).click();
  // The same answer for every e-mail, nobody signed in (D36); no account before the link (D42).
  await expect(register.getByRole('status')).toContainText('A mail to this address');
  await expect(page.locator('.shell-me')).toHaveCount(0);
  await page
    .getByRole('region', { name: 'Create an account' })
    .getByRole('button', { name: 'Sign in' })
    .click();
  const early = page.getByRole('form', { name: 'Sign in' });
  await early.getByLabel('Name or e-mail').fill(name);
  await early.getByLabel('Password').fill('the first long password');
  await early.getByRole('button', { name: 'Sign in' }).click();
  await expect(early.getByRole('alert')).toHaveText('Wrong name, e-mail or password.');

  const ready = await mailTo(request, email, 'Confirm your Seasonal Cases account');
  const confirmLink = /http\S+\/confirm\?token=[\w-]+/.exec(ready.text)?.[0] ?? '';
  expect(confirmLink).not.toBe('');
  await page.goto(confirmLink);
  await page
    .getByRole('region', { name: 'Confirm your account' })
    .getByRole('button', { name: 'Confirm' })
    .click();
  await expect(page.getByRole('status')).toContainText(`Your account ${name} is ready`);
  await page.getByRole('status').getByRole('link', { name: 'Sign in' }).click();
  const first = page.getByRole('form', { name: 'Sign in' });
  await first.getByLabel('Name or e-mail').fill(name);
  await first.getByLabel('Password').fill('the first long password');
  await first.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('.shell-me')).toContainText(name);
  await page.getByRole('button', { name: 'Sign out' }).click();

  await page
    .getByRole('region', { name: 'Sign in' })
    .getByRole('button', { name: 'Forgotten password' })
    .click();
  const forgot = page.getByRole('form', { name: 'Forgotten password' });
  await forgot.getByLabel('E-mail').fill(email);
  await forgot.getByRole('button', { name: 'Send the link' }).click();
  await expect(forgot.getByRole('status')).toContainText('a link is on its way');

  const mail = await mailTo(request, email, 'Your Seasonal Cases password');
  const link = /http\S+\/reset\?token=[\w-]+/.exec(mail.text)?.[0] ?? '';
  expect(link).not.toBe('');
  await page.goto(link);
  const reset = page.getByRole('form', { name: 'Choose a new password' });
  await reset.getByLabel('New password').fill('the second long password');
  await reset.getByRole('button', { name: 'Set password' }).click();
  await expect(page.getByRole('status')).toContainText('Your new password is set');

  await page.goto('/');
  const signIn = page.getByRole('form', { name: 'Sign in' });
  await signIn.getByLabel('Name or e-mail').fill(email);
  await signIn.getByLabel('Password').fill('the first long password');
  await signIn.getByRole('button', { name: 'Sign in' }).click();
  await expect(signIn.getByRole('alert')).toHaveText('Wrong name, e-mail or password.');
  await signIn.getByLabel('Password').fill('the second long password');
  await signIn.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('.shell-me')).toContainText(name);

  await page.getByRole('link', { name: 'My matches' }).click();
  await expect(page.getByRole('region', { name: 'My matches' })).toContainText(
    'You have not picked a case yet.',
  );

  // The test's mail goes; Mailpit keeps nothing of this run.
  await request.delete(`${MAILPIT}/messages`, { data: { IDs: [ready.id, mail.id] } });
});
