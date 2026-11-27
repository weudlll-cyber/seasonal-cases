/**
 * @file   packages/domain/src/index.ts
 * @brief  Public entry of @sc/domain: the pure rules of a show.
 *
 * Responsibility: name what the application layer may import from the domain: the commands
 *                 and `decide`, the fold, the projections, sealing with its check, the random
 *                 port with the seeded generator, the settings, and `redactPlayer`.
 * Depends on:     the modules re-exported below
 */
export { decide, decideCreate, type CreateCommand, type ShowCommand } from './commands.js';
export type { Actor, ShowEvent, ShowEventType } from './events.js';
export type { Decision } from './live.js';
export { applyEvent, foldShow, type Sealing, type ShowModel } from './model.js';
export {
  organiserView,
  personalView,
  publicView,
  showResult,
  type People,
  type Person,
} from './projection.js';
export { seededRandom, type RandomPort } from './random.js';
export { redactPlayer } from './redact.js';
export { botId, currentClaims, type Claim } from './registration.js';
export { canonicalJson, commitmentOf, verify } from './sealing.js';
export { DEFAULT_SETTINGS, type PrizeArtifactSetting, type ShowSettings } from './settings.js';
export { CASE_LIMITS, setupProblem, type SetupInput } from './setup.js';
