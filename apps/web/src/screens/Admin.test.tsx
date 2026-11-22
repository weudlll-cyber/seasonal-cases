/**
 * @file   apps/web/src/screens/Admin.test.tsx
 * @brief  Tests the admin page: the setup form waits for the settings' defaults, so their late
 *         arrival never replaces what was typed (a slow browser lost the journeys' "12" to the
 *         default 24), and "Fill with bots" shows in development only (DECISIONS D34).
 */
import { DEFAULT_SETTINGS } from '@sc/contracts';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MIA } from '../testing/views.js';
import { Admin } from './Admin.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const SHOW = {
  id: 's1',
  state: 'registration',
  caseCount: 4,
  winnerCount: 1,
  createdAt: '2026-11-22T20:00:00.000Z',
};
const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));

/** Answers /api/settings when `release` is called, and the show list at once. */
function stubServer(): () => void {
  let release = (): void => undefined;
  const settings = new Promise<Response>((resolve) => {
    release = () => {
      resolve(new Response(JSON.stringify({ ...DEFAULT_SETTINGS, defaultCases: 30 })));
    };
  });
  vi.stubGlobal(
    'fetch',
    vi.fn((path: string) => (path.endsWith('/settings') ? settings : json([SHOW]))),
  );
  return () => {
    release();
  };
}

describe('the admin page', () => {
  it('shows the setup form only once the defaults are in, starting from them', async () => {
    const release = stubServer();
    render(<Admin me={MIA} onShowChanged={() => Promise.resolve()} dev={false} />);
    expect(screen.getByText('Loading the settings…')).toBeDefined();
    expect(screen.queryByLabelText('Cases (N)')).toBeNull();
    release();
    const cases = await screen.findByLabelText('Cases (N)');
    expect((cases as HTMLInputElement).value).toBe('30');
  });

  it('offers "Fill with bots" in development only', async () => {
    stubServer()();
    const { unmount } = render(
      <Admin me={MIA} onShowChanged={() => Promise.resolve()} dev={false} />,
    );
    expect(await screen.findByRole('button', { name: 'Seal' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Fill with bots' })).toBeNull();
    unmount();
    stubServer()();
    render(<Admin me={MIA} onShowChanged={() => Promise.resolve()} dev />);
    expect(await screen.findByRole('button', { name: 'Fill with bots' })).toBeDefined();
  });
});
