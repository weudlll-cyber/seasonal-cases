/**
 * @file   packages/application/src/createShow.ts
 * @brief  The first use case: check a requested setup against the domain's limits.
 *
 * Responsibility: turn the domain's answer into the application's result shape.
 * Depends on:     @sc/domain
 */
import { setupProblem, type SetupInput } from '@sc/domain';

export type SetupCheck = { readonly ok: true } | { readonly ok: false; readonly reason: string };

/** Whether a show with this setup may be created. */
export function checkSetup(input: SetupInput): SetupCheck {
  const reason = setupProblem(input);
  return reason === null ? { ok: true } : { ok: false, reason };
}
