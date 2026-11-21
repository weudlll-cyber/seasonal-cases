/**
 * @file   packages/domain/src/index.ts
 * @brief  Public entry of @sc/domain: the pure rules of a show.
 *
 * Responsibility: name what the application layer may import from the domain.
 * Depends on:     ./setup.js
 */
export { CASE_LIMITS, setupProblem, type SetupInput } from './setup.js';
