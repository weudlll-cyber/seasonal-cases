/**
 * @file   packages/domain/src/settings.ts
 * @brief  The part of the settings a show copies when it is created: artifacts and presentation.
 *
 * Responsibility: the settings catalogue lives in @sc/contracts (CONCEPT §9, DECISIONS D25);
 *                 the setup reads only the artifact names, their order and seasons, and the
 *                 presentation, and copies them into the show's first event, so a later change
 *                 applies to new shows only. The logic never names an artifact itself.
 * Depends on:     @sc/contracts
 */
import { DEFAULT_SETTINGS as CATALOGUE_DEFAULTS, type Settings } from '@sc/contracts';

export type ShowSettings = Pick<
  Settings,
  'prizeArtifacts' | 'relicName' | 'blankName' | 'presentation'
>;
export type PrizeArtifactSetting = Settings['prizeArtifacts'][number];

// The catalogue's defaults (proposals, CONCEPT §14).
export const DEFAULT_SETTINGS: ShowSettings = CATALOGUE_DEFAULTS;
