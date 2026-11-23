/**
 * @file   packages/contracts/src/settings.ts
 * @brief  The settings catalogue: every value an admin may change, with its default, its
 *         description, its limits and a warning where a value is delicate.
 *
 * Responsibility: the one catalogue CLAUDE.md asks for (CONCEPT §9, DECISIONS D25), with the
 *                 stage's sound volume since SC-N3. A change
 *                 applies to new shows only: a show copies the values it needs when it is created
 *                 (the artifacts and its presentation). `SettingsSchema` checks a whole set of
 *                 values against the limits written here; `SETTINGS_CATALOGUE` describes each
 *                 for the admin area. Rank source and chronicle length wait for the owner's word.
 * Depends on:     zod, ./artifact.js
 */
import { z } from 'zod';

import { ArtifactSeasonSchema } from './artifact.js';

export const CASES_RANGE = { min: 2, max: 99 } as const;
export const TRAVEL_RANGE = { min: 200, max: 3000 } as const;
export const OPEN_RANGE = { min: 400, max: 5000 } as const;
const NAME_MAX = 40;

/** How a show plays on the stage; copied into the show when it is created. */
export const PresentationSchema = z.object({
  // The case's way to the front and back, in milliseconds.
  travelMs: z.number().int().min(TRAVEL_RANGE.min).max(TRAVEL_RANGE.max),
  // The lid lifting at "Open", in milliseconds.
  openMs: z.number().int().min(OPEN_RANGE.min).max(OPEN_RANGE.max),
  // Confetti on the main prize (CONCEPT §7).
  confetti: z.boolean(),
  // The stage's sound, 0 to 100; every viewer turns it on for themselves (SC-N3 piece 5).
  volume: z.number().int().min(0).max(100),
});
export type Presentation = z.infer<typeof PresentationSchema>;

export const PrizeArtifactSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX),
  // 'current': the season of the show's date.
  season: z.union([ArtifactSeasonSchema, z.literal('current')]),
});
export type PrizeArtifact = z.infer<typeof PrizeArtifactSchema>;

export const SettingsSchema = z
  .object({
    defaultCases: z.number().int().min(CASES_RANGE.min).max(CASES_RANGE.max),
    defaultWinners: z.number().int().min(1).max(CASES_RANGE.max),
    // Slot 1, 2, … in this order; slots past the list are relics.
    prizeArtifacts: z.array(PrizeArtifactSchema).min(1).max(CASES_RANGE.max),
    relicName: z.string().trim().min(1).max(NAME_MAX).includes('{n}'),
    blankName: z.string().trim().min(1).max(NAME_MAX),
    presentation: PresentationSchema,
  })
  .refine((s) => s.defaultWinners <= s.defaultCases, {
    message: 'the default winners cannot be more than the default cases',
    path: ['defaultWinners'],
  });
export type Settings = z.infer<typeof SettingsSchema>;

// CONCEPT §3.1 and §6: the owner's examples in the proposed order (proposals, §14); the motion of
// night chain SC-N2 piece 2 (proposals, HANDOVER).
export const DEFAULT_SETTINGS: Settings = {
  defaultCases: 24,
  defaultWinners: 3,
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
  presentation: { travelMs: 800, openMs: 1600, confetti: true, volume: 60 },
};

export interface SettingEntry {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly min?: number;
  readonly max?: number;
  readonly warning?: string;
}

/** What the admin area says about each value, in the order it shows them. */
export const SETTINGS_CATALOGUE: readonly SettingEntry[] = [
  {
    key: 'defaultCases',
    label: 'Cases (default)',
    description: 'The number of cases a new show starts with; the organiser may change it.',
    ...CASES_RANGE,
  },
  {
    key: 'defaultWinners',
    label: 'Prizes (default)',
    description: 'The number of prize slots a new show starts with.',
    min: 1,
    max: CASES_RANGE.max,
    warning: 'At most the default number of cases.',
  },
  {
    key: 'prizeArtifacts',
    label: 'Prize artifacts',
    description: 'The artifact of prize 1, 2, … in this order, each with its season colour.',
    warning: 'Prize 1 is the main prize: it gets the confetti and the ceremony.',
  },
  {
    key: 'relicName',
    label: 'Further prizes',
    description: 'The name of every prize past the list; {n} becomes the prize number.',
    warning: 'Keep {n} in the name, or every further prize has the same name.',
  },
  {
    key: 'blankName',
    label: 'No prize',
    description: 'The artifact in every case without a prize.',
  },
  {
    key: 'presentation.travelMs',
    label: 'Travel (ms)',
    description: 'How long a selected case takes to travel to the front, and back.',
    ...TRAVEL_RANGE,
    warning: 'Below 500 ms the travel is hard to follow on a stream.',
  },
  {
    key: 'presentation.openMs',
    label: 'Opening (ms)',
    description: 'How long the lid takes to lift at "Open".',
    ...OPEN_RANGE,
  },
  {
    key: 'presentation.volume',
    label: 'Sound volume',
    description: 'How loud the stage sounds for a viewer who turned the sound on (0 to 100).',
    min: 0,
    max: 100,
    warning: 'Viewers hear it over their own call or stream: keep it moderate.',
  },
  {
    key: 'presentation.confetti',
    label: 'Confetti',
    description: 'Confetti when the main prize is opened and in the ceremony.',
  },
];
