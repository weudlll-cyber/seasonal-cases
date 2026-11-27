/**
 * @file   apps/web/src/screens/PrivacyPage.test.tsx
 * @brief  Tests the privacy page (D61): it names the contact the operator configured and falls back
 *         to "the operator of this site"; standalone it says how to delete and download, in website
 *         mode it says both are on the website.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PrivacyPage } from './PrivacyPage.js';

afterEach(cleanup);

describe('the privacy page', () => {
  it('names the configured contact, or the operator of the site until there is one', () => {
    render(<PrivacyPage website={false} contact="privacy@example.org" />);
    expect(screen.getByText(/privacy@example\.org/)).toBeTruthy();
    cleanup();
    render(<PrivacyPage website={false} contact="  " />);
    expect(screen.getByText(/the operator of this site/)).toBeTruthy();
  });

  it('points a standalone player to the account page, and a member to the website', () => {
    render(<PrivacyPage website={false} contact="" />);
    expect(screen.getByRole('link', { name: 'account page' }).getAttribute('href')).toContain(
      '/account',
    );
    expect(screen.getByText(/14 days/)).toBeTruthy();
    cleanup();
    render(<PrivacyPage website contact="" />);
    expect(screen.queryByRole('link', { name: 'account page' })).toBeNull();
    expect(screen.getByText(/you delete or download them there/)).toBeTruthy();
  });
});
