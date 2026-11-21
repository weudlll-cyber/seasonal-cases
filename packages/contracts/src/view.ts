/**
 * @file   packages/contracts/src/view.ts
 * @brief  The views the server sends: public, organiser, personal, and the result.
 *
 * Responsibility: the shapes a client renders. The public view never holds the content of an
 *                 unopened case, the assignment or the secret (CONCEPT §8); the organiser view
 *                 adds only the direction (the organiser does not know the contents either,
 *                 CONCEPT §3.3); the personal view tells a player where they stand.
 * Depends on:     zod, ./show.js, ./artifact.js
 */
import { z } from 'zod';

import { ArtifactSchema, PrizeSlotSchema } from './artifact.js';
import { PresentationSchema } from './settings.js';
import {
  BadgeSchema,
  RankSchema,
  RevealStepSchema,
  SeasonSchema,
  ShowStateSchema,
} from './show.js';

export const CaseViewSchema = z.object({
  number: z.number().int().min(1),
  ownerId: z.string().nullable(),
  ownerName: z.string().nullable(),
  // The owner's website step icons (website mode); empty otherwise.
  ownerBadges: z.array(BadgeSchema),
  ownerRank: RankSchema.nullable(),
  // From the "Open" step on the content is public and stays public (CONCEPT §3.4).
  opened: z.boolean(),
  artifact: ArtifactSchema.nullable(),
});
export type CaseView = z.infer<typeof CaseViewSchema>;

export const ClaimantSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  badges: z.array(BadgeSchema),
  rank: RankSchema,
  // ISO time of the claim; with equal rank the earlier claim holds (CONCEPT §3.2).
  at: z.string(),
});
export type Claimant = z.infer<typeof ClaimantSchema>;

// One case of the registration board: who holds it now and who else wants it.
export const BoardCaseSchema = z.object({
  number: z.number().int().min(1),
  holder: ClaimantSchema.nullable(),
  others: z.array(ClaimantSchema),
});
export type BoardCase = z.infer<typeof BoardCaseSchema>;

export const FoundPrizeSchema = z.object({
  slot: z.number().int().min(1),
  label: z.string(),
  artifact: ArtifactSchema,
  caseNumber: z.number().int().min(1),
  ownerName: z.string().nullable(),
});
export type FoundPrize = z.infer<typeof FoundPrizeSchema>;

export const AssignmentEntrySchema = z.object({
  caseNumber: z.number().int().min(1),
  artifactId: z.string(),
});
export type AssignmentEntry = z.infer<typeof AssignmentEntrySchema>;

export const ShowResultSchema = z.object({
  winners: z.array(FoundPrizeSchema),
  cases: z.array(
    z.object({
      number: z.number().int().min(1),
      ownerName: z.string().nullable(),
      artifact: ArtifactSchema,
    }),
  ),
  sealedAt: z.string(),
  endedAt: z.string(),
  commitment: z.string(),
  // Revealed only after the show (CONCEPT §3.3).
  secret: z.string(),
  assignment: z.array(AssignmentEntrySchema),
  verified: z.boolean(),
});
export type ShowResult = z.infer<typeof ShowResultSchema>;

// How many ended shows the chronicle lists; a setting once the owner names one (CONCEPT §9).
export const CHRONICLE_LENGTH = 50;

/** One ended show in the chronicle (CONCEPT §3.5): its winners and its proof. */
export const ChronicleEntrySchema = z.object({
  id: z.string(),
  endedAt: z.string(),
  caseCount: z.number().int(),
  winners: z.array(FoundPrizeSchema),
  commitment: z.string(),
  verified: z.boolean(),
});
export type ChronicleEntry = z.infer<typeof ChronicleEntrySchema>;

export const PublicShowViewSchema = z.object({
  id: z.string(),
  state: ShowStateSchema,
  // Registration has no state of its own once closed: the show stays in 'registration',
  // closed, until it is sealed.
  registrationOpen: z.boolean(),
  createdAt: z.string(),
  caseCount: z.number().int(),
  winnerCount: z.number().int(),
  prizeSlots: z.array(PrizeSlotSchema),
  // Which artifact means which prize slot, and the blank (CONCEPT §3.1, §6).
  artifactTable: z.array(ArtifactSchema),
  cases: z.array(CaseViewSchema),
  // The conflict view while registration is open; null otherwise.
  board: z.array(BoardCaseSchema).nullable(),
  commitment: z.string().nullable(),
  sealedAt: z.string().nullable(),
  // begun: the opening is over and cases can be selected (DECISIONS D22).
  live: z.object({
    begun: z.boolean(),
    selected: z.number().int().nullable(),
    step: RevealStepSchema,
  }),
  // The season of the show's creation date: the start card's tint (CONCEPT §6, §7).
  season: SeasonSchema.nullable(),
  allPrizesFound: z.boolean(),
  // The stage's motion and confetti, as copied into the show at its creation (D25).
  presentation: PresentationSchema,
  result: ShowResultSchema.nullable(),
});
export type PublicShowView = z.infer<typeof PublicShowViewSchema>;

export const OrganiserRefSchema = z.object({ id: z.string(), name: z.string() });
export type OrganiserRef = z.infer<typeof OrganiserRefSchema>;

export const OrganiserViewSchema = z.object({
  show: PublicShowViewSchema,
  holder: OrganiserRefSchema.nullable(),
  // The signed-in organisers watching this show: the hand-over's choices.
  organisers: z.array(OrganiserRefSchema),
});
export type OrganiserView = z.infer<typeof OrganiserViewSchema>;

// A player's standing on one case if they picked it now (CONCEPT §3.2): 'yours' they hold it,
// 'free' nobody holds it, 'higher' their rank beats the holder's, 'equal' or 'lower' the holder
// keeps it (with equal rank the earlier claim holds).
export const STANDINGS = ['yours', 'free', 'higher', 'equal', 'lower'] as const;
export const StandingSchema = z.enum(STANDINGS);
export type Standing = z.infer<typeof StandingSchema>;

export const PersonalViewSchema = z.object({
  showId: z.string(),
  claim: z.number().int().nullable(),
  holds: z.boolean(),
  standings: z.array(z.object({ number: z.number().int(), standing: StandingSchema })),
});
export type PersonalView = z.infer<typeof PersonalViewSchema>;

// The website's open sign-ups (Seasonal Entertainment docs/OPEN-ROUNDS.md, version 1).
export const OPEN_ROUNDS_MAX = 20;

export const OpenRoundSchema = z.object({
  id: z.string().max(64),
  title: z.string().max(80),
  kind: z.string().max(40),
  startsAt: z.string().nullable(),
  signupClosesAt: z.string().nullable(),
  players: z.number().int().min(0),
  maxPlayers: z.number().int().min(1).nullable(),
  joinUrl: z.string(),
});
export type OpenRound = z.infer<typeof OpenRoundSchema>;

export const OpenRoundsPageSchema = z.object({
  version: z.literal(1),
  rounds: z.array(OpenRoundSchema).max(OPEN_ROUNDS_MAX),
});
export type OpenRoundsPage = z.infer<typeof OpenRoundsPageSchema>;
