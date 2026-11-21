/**
 * @file   packages/domain/src/projection.ts
 * @brief  The views of a show: public, moderator, personal, and the result.
 *
 * Responsibility: the only way a show's state leaves the server. The public view holds a
 *                 case's artifact only once that case is open, and never the assignment or the
 *                 secret before the show has ended (CONCEPT §8). The moderator view adds the
 *                 direction and the moderators to hand over to, never the contents
 *                 (CONCEPT §3.3).
 * Depends on:     @sc/contracts (types), ./model.js, ./registration.js, ./sealing.js, ./setup.js
 */
import {
  prizeLabel,
  type Artifact,
  type CaseView,
  type FoundPrize,
  type ModeratorRef,
  type ModeratorView,
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

function caseView(model: ShowModel, caseNumber: number): CaseView {
  const owner = ownerOf(model, caseNumber);
  const opened = model.opened.includes(caseNumber);
  return {
    number: caseNumber,
    ownerId: owner?.player.id ?? null,
    ownerName: owner?.player.name ?? null,
    ownerRank: owner?.rank ?? null,
    opened,
    // The redaction: an unopened case's content never leaves the server.
    artifact: opened ? sealedArtifact(model, caseNumber) : null,
  };
}

function foundPrize(model: ShowModel, caseNumber: number, artifact: Artifact): FoundPrize | null {
  const slot = model.prizeSlots.find((s) => s.slot === artifact.prizeSlot);
  if (slot === undefined) return null;
  return {
    slot: slot.slot,
    label: prizeLabel(slot),
    artifact,
    caseNumber,
    ownerName: ownerOf(model, caseNumber)?.player.name ?? null,
  };
}

/** Prizes whose meaning has been shown: opened, and past the "Open" step if on stage now. */
function found(model: ShowModel): FoundPrize[] {
  return model.opened
    .filter((n) => !(n === model.selected && model.step === 'open'))
    .map((n) => foundPrize(model, n, sealedArtifact(model, n)))
    .filter((f): f is FoundPrize => f !== null)
    .sort((a, b) => a.slot - b.slot);
}

/** The whole show after it has ended, with the secret revealed and checked. */
export function showResult(model: ShowModel): ShowResult | null {
  const { sealing, endedAt } = model;
  if (model.state !== 'ended' || sealing === null || endedAt === null) return null;
  const cases = Array.from({ length: model.caseCount }, (_, i) => ({
    number: i + 1,
    ownerName: ownerOf(model, i + 1)?.player.name ?? null,
    artifact: sealedArtifact(model, i + 1),
  }));
  const winners = cases
    .map((c) => foundPrize(model, c.number, c.artifact))
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

/** What everybody may see. */
export function publicView(model: ShowModel): PublicShowView {
  const shown = found(model);
  const foundIds = new Set(shown.map((f) => f.artifact.id));
  return {
    id: model.id,
    state: model.state,
    registrationOpen: model.registrationOpen,
    createdAt: model.createdAt,
    caseCount: model.caseCount,
    winnerCount: model.prizes.length,
    prizeSlots: [...model.prizeSlots],
    artifactTable: [...model.prizes, model.blank],
    cases: Array.from({ length: model.caseCount }, (_, i) => caseView(model, i + 1)),
    board: model.registrationOpen ? board(model.claims, model.caseCount) : null,
    commitment: model.sealing?.commitment ?? null,
    sealedAt: model.sealing?.at ?? null,
    live: { selected: model.selected, step: model.step },
    found: shown,
    stillHidden: model.prizes.filter((p) => !foundIds.has(p.id)),
    allPrizesFound: shown.length === model.prizes.length,
    result: showResult(model),
  };
}

/** The public view plus the direction: who holds it and whom it can go to. */
export function moderatorView(
  model: ShowModel,
  moderators: readonly ModeratorRef[],
): ModeratorView {
  return { show: publicView(model), holder: model.holder, moderators: [...moderators] };
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
