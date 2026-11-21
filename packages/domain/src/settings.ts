/**
 * @file   packages/domain/src/settings.ts
 * @brief  The show's settings with their defaults: artifact names, order and seasons.
 *
 * Responsibility: one settings object the setup reads (CONCEPT §6, §9: names and order are
 *                 settings, not code). The full build moves it into the settings catalogue of
 *                 the admin area (BACKLOG 6); the logic never names an artifact itself.
 * Depends on:     @sc/contracts (types)
 */
import type { ArtifactSeason } from '@sc/contracts';

export interface PrizeArtifactSetting {
  readonly name: string;
  // 'current': the season of the show's date (Relic and the blank, CONCEPT §6).
  readonly season: ArtifactSeason | 'current';
}

export interface ShowSettings {
  // Slot 1, 2, … in this order; slots past the list are relics.
  readonly prizeArtifacts: readonly PrizeArtifactSetting[];
  // "{n}" is the slot number.
  readonly relicName: string;
  readonly blankName: string;
}

// CONCEPT §6, the owner's examples in the proposed order (proposal, §14).
export const DEFAULT_SETTINGS: ShowSettings = {
  prizeArtifacts: [
    { name: 'Halving Stone', season: 'all' },
    { name: 'Season Key', season: 'autumn' },
    { name: 'Winter Crystal', season: 'winter' },
    { name: 'Spring Seed', season: 'spring' },
    { name: 'Summer Flame', season: 'summer' },
    { name: 'Ancient Leaf', season: 'autumn' },
  ],
  relicName: 'Relic #{n}',
  blankName: 'Fallen Leaf',
};
