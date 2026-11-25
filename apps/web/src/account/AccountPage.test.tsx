/**
 * @file   apps/web/src/account/AccountPage.test.tsx
 * @brief  Tests the account page (D61): a standalone player can download their data and delete the
 *         account (the second factor's code is asked only when the account has one, the server's
 *         refusal is shown, and the browser is signed out afterwards); a website member is sent to
 *         the website and gets no button the server would refuse.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANA } from '../testing/views.js';
import { AccountPage } from './AccountPage.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A server whose second factor is on or off and whose deletion answers as given. */
function stubServer(enabled: boolean, deletion: Response) {
  const fetcher = vi.fn((path: string, _init?: RequestInit) =>
    Promise.resolve(
      path.endsWith('/me/2fa') ? Response.json({ required: false, enabled }) : deletion,
    ),
  );
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const deleteCalls = (fetcher: ReturnType<typeof stubServer>) =>
  fetcher.mock.calls.filter(([path]) => path.endsWith('/me/delete'));

/** The JSON the deletion request carried. */
function sentBody(fetcher: ReturnType<typeof stubServer>): unknown {
  const body = deleteCalls(fetcher)[0]?.[1]?.body;
  return typeof body === 'string' ? JSON.parse(body) : undefined;
}

async function openForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
  return screen.findByLabelText('Password');
}

describe('the account page', () => {
  it('offers the download and, after the password, deletes and signs the browser out', async () => {
    const fetcher = stubServer(false, Response.json({ ok: true }));
    const onGone = vi.fn(() => Promise.resolve());
    render(<AccountPage me={ANA} website={false} onGone={onGone} />);
    const download = screen.getByRole('button', { name: 'Download my data' });
    expect(download.closest('form')?.getAttribute('action')).toContain('/me/export');
    expect(download.className).toBe('button');
    fireEvent.change(await openForm(), { target: { value: 'a long enough secret' } });
    expect(screen.queryByLabelText('Code of your second factor')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account for good' }));
    await waitFor(() => {
      expect(onGone).toHaveBeenCalledOnce();
    });
    expect(sentBody(fetcher)).toEqual({
      password: 'a long enough secret',
    });
  });

  it("asks for the second factor's code when the account has one, and shows a refusal", async () => {
    const refusal = Response.json({ error: 'Wrong code.' }, { status: 401 });
    const fetcher = stubServer(true, refusal);
    const onGone = vi.fn(() => Promise.resolve());
    render(<AccountPage me={ANA} website={false} onGone={onGone} />);
    fireEvent.change(await openForm(), { target: { value: 'a long enough secret' } });
    fireEvent.change(await screen.findByLabelText('Code of your second factor'), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account for good' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Wrong code.');
    expect(onGone).not.toHaveBeenCalled();
    expect(sentBody(fetcher)).toMatchObject({
      code: '000000',
    });
  });

  it('leaves a website member to the website', () => {
    render(<AccountPage me={ANA} website onGone={vi.fn(() => Promise.resolve())} />);
    expect(screen.queryByRole('button', { name: 'Delete my account' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Download my data' })).toBeNull();
    expect(screen.getByText(/belongs to the website/)).toBeTruthy();
  });

  it('asks a guest to sign in', () => {
    render(<AccountPage me={null} website={false} onGone={vi.fn(() => Promise.resolve())} />);
    expect(screen.getByText('Sign in to see your account.')).toBeTruthy();
  });
});
