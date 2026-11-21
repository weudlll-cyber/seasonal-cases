/**
 * @file   packages/domain/src/setup.test.ts
 * @brief  Tests the setup limits: 2 ≤ N ≤ 99, 1 ≤ W ≤ N, whole numbers only.
 */
import { describe, expect, it } from 'vitest';

import { setupProblem } from './setup.js';

describe('setupProblem', () => {
  it('accepts the edges of the limits', () => {
    expect(setupProblem({ cases: 2, winners: 1 })).toBeNull();
    expect(setupProblem({ cases: 99, winners: 99 })).toBeNull();
  });

  it('refuses too few or too many cases and fractions', () => {
    expect(setupProblem({ cases: 1, winners: 1 })).toMatch(/cases/);
    expect(setupProblem({ cases: 100, winners: 1 })).toMatch(/cases/);
    expect(setupProblem({ cases: 2.5, winners: 1 })).toMatch(/cases/);
  });

  it('refuses no winners or more winners than cases', () => {
    expect(setupProblem({ cases: 5, winners: 0 })).toMatch(/winners/);
    expect(setupProblem({ cases: 5, winners: 6 })).toMatch(/winners/);
    expect(setupProblem({ cases: 5, winners: 1.5 })).toMatch(/winners/);
  });
});
