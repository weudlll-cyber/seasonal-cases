/**
 * @file   apps/web/src/App.test.tsx
 * @brief  Tests that the root component renders the show's name.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('App', () => {
  it('shows the name of the show', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Seasonal Cases' })).toBeDefined();
  });
});
