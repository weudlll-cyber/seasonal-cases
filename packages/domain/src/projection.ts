/**
 * @file   packages/domain/src/projection.ts
 * @brief  The views of a show: public, organiser, personal, and the result.
 *
 * Responsibility: the only way a show's state leaves the server. The public view holds a
 *                 case's artifact only once that case is open, and never the assignment or the
 *                 secret before the show has ended (CONCEPT §8). The organiser view adds the
 *                 direction and the organisers to hand over to, never the contents
 *                 (CONCEPT §3.3). Names and badges come from the `people` lookup where it knows
 *                 the player (the server's accounts: a renamed or deleted account shows its
 *                 current name), else from the name recorded with the claim.
 * Depends on:     @sc/contracts (types), ./model.js, ./registration.js, ./sealing.js, ./setup.js
 */
import {
  prizeLabel,
  SEASONS,
  type Artifact,
  type BoardCase,
  type CaseView,
  type Claimant,
  type FoundPrize,
  type OrganiserRef,
  type OrganiserView,
  type PersonalView,
  type PublicShowView,
  type Rank,
  type ShowResult,
} from '@sc/contracts';

import type { ShowModel } from './model.js';
import { board, currentClaims, standings, type Claim } from './registration.js';
import { verify } from './sealing.js';
import { BLANK_ID } from './setup.js';

/** The artifact sealed into a case; only for opened cases or the ended show. */
function sealedArtifact(model: ShowModel, caseNumber: number): Artifact {
  const id = model.sealing?.assignment.find((e) => e.caseNumber === caseNumber)?.artifactId;
  if (id === undefined) throw new Error(`case ${String(caseNumber)} has no sealed content`);
  if (id.startsWith(`${BLANK_ID}-`)) return { ...model.blank, id };
  const prize = model.prizes.find((p) => p.id === id);
  if (prize === undefined) throw new Error(`unknown artifact ${id}`);
  return prize;
}

const ownerOf = (model: ShowModel, caseNumber: number): Claim | null =>
  model.owners?.[caseNumber - 1] ?? null;

/** A player as the screens name them: the current name and the website badges. */
export interface Person {
  readonly name: string;
  readonly badges: readonly string[];
}
export type People = (playerId: string) => Person | undefined;
const nobody: People = () => undefined;

const nameOf = (people: People, claim: Claim | null): string | null =>
  claim === null ? null : (people(claim.player.id)?.name ?? claim.player.name);
const badgesOf = (people: People, id: string | undefined): string[] =>
  id === undefined ? [] : [...(people(id)?.badges ?? [])];

function caseView(model: ShowModel, caseNumber: number, people: People): CaseView {
  const owner = ownerOf(model, caseNumber);
  const opened = model.opened.includes(caseNumber);
  return {
    number: caseNumber,
    ownerId: owner?.player.id ?? null,
    ownerName: nameOf(people, owner),
    ownerBadges: badgesOf(people, owner?.player.id),
    ownerRank: owner?.rank ?? null,
    opened,
    // The redaction: an unopened case's content never leaves the server.
    artifact: opened ? sealedArtifact(model, caseNumber) : null,
  };
}

function foundPrize(
  model: ShowModel,
  caseNumber: number,
  artifact: Artifact,
  people: People,
): FoundPrize | null {
  const slot = model.prizeSlots.find((s) => s.slot === artifact.prizeSlot);
  if (slot === undefined) return null;
  return {
    slot: slot.slot,
    label: prizeLabel(slot),
    artifact,
    caseNumber,
    ownerName: nameOf(people, ownerOf(model, caseNumber)),
  };
}

/** Whether every prize's case is open: each counts from its "Open" step (CONCEPT §3.4). */
function allPrizesFound(model: ShowModel): boolean {
  const open = model.opened.filter((n) => sealedArtifact(model, n).prizeSlot !== null);
  return open.length === model.prizes.length;
}

/** The whole show after it has ended, with the secret revealed and checked. */
export function showResult(model: ShowModel, people: People = nobody): ShowResult | null {
  const { sealing, endedAt } = model;
  if (model.state !== 'ended' || sealing === null || endedAt === null) return null;
  const cases = Array.from({ length: model.caseCount }, (_, i) => ({
    number: i + 1,
    ownerName: nameOf(people, ownerOf(model, i + 1)),
    artifact: sealedArtifact(model, i + 1),
  }));
  const winners = cases
    .map((c) => foundPrize(model, c.number, c.artifact, people))
    .filter((f): f is FoundPrize => f !== null)
    .sort((a, b) => a.slot - b.slot);
  return {
    winners,
    cases,
    sealedAt: sealing.at,
    endedAt,
    commitment: sealing.commitment,
    secret: sealing.secret,
    assignment: [...sealing.assignment],
    verified: verify(sealing.assignment, sealing.secret, sealing.commitment),
  };
}

/** The conflict view with the current names and badges. */
function namedBoard(model: ShowModel, people: People): BoardCase[] {
  const named = (c: Claimant): Claimant => ({
    ...c,
    name: people(c.playerId)?.name ?? c.name,
    badges: badgesOf(people, c.playerId),
  });
  return board(model.claims, model.caseCount).map((b) => ({
    ...b,
    holder: b.holder === null ? null : named(b.holder),
    others: b.others.map(named),
  }));
}

/** What everybody may see. */
export function publicView(model: ShowModel, people: People = nobody): PublicShowView {
  return {
    id: model.id,
    state: model.state,
    registrationOpen: model.registrationOpen,
    createdAt: model.createdAt,
    caseCount: model.caseCount,
    winnerCount: model.prizes.length,
    prizeSlots: [...model.prizeSlots],
    artifactTable: [...model.prizes, model.blank],
    cases: Array.from({ length: model.caseCount }, (_, i) => caseView(model, i + 1, people)),
    board: model.registrationOpen ? namedBoard(model, people) : null,
    commitment: model.sealing?.commitment ?? null,
    sealedAt: model.sealing?.at ?? null,
    live: { begun: model.begun, selected: model.selected, step: model.step },
    season: SEASONS.find((s) => s === model.blank.season) ?? null,
    allPrizesFound: allPrizesFound(model),
    result: showResult(model, people),
  };
}

/** The public view plus the direction: who holds it and whom it can go to. */
export function organiserView(
  model: ShowModel,
  organisers: readonly OrganiserRef[],
  people: People = nobody,
): OrganiserView {
  const holder =
    model.holder === null
      ? null
      : { id: model.holder.id, name: people(model.holder.id)?.name ?? model.holder.name };
  return { show: publicView(model, people), holder, organisers: [...organisers] };
}

/** Where one player stands: their claim, whether it holds, and their standing per case. */
export function personalView(
  model: ShowModel,
  player: { readonly id: string; readonly rank: Rank },
): PersonalView {
  const mine = currentClaims(model.claims).find((c) => c.player.id === player.id);
  const all = standings(model.claims, model.caseCount, player);
  const holds = model.registrationOpen
    ? all.some((s) => s.standing === 'yours')
    : model.owners?.some((o) => o?.player.id === player.id) === true;
  return {
    showId: model.id,
    claim: mine?.caseNumber ?? null,
    holds,
    standings: model.registrationOpen ? all : [],
  };
}
