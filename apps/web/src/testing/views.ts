/**
 * @file   apps/web/src/testing/views.ts
 * @brief  Test fixtures: views as the server sends them, written out by hand.
 *
 * Responsibility: give the component tests a public view, an organiser view and a personal view
 *                 without the server, so each test says exactly which view the client renders.
 *                 Used by tests only.
 * Depends on:     @sc/contracts (types)
 */
import { DEFAULT_SETTINGS } from '@sc/contracts';
import type {
  Artifact,
  CaseView,
  Me,
  OrganiserView,
  PublicShowView,
  RevealStep,
  ShowResult,
} from '@sc/contracts';

export const STONE: Artifact = {
  id: 'prize-1',
  name: 'Halving Stone',
  season: 'all',
  prizeSlot: 1,
};
export const KEY: Artifact = { id: 'prize-2', name: 'Season Key', season: 'autumn', prizeSlot: 2 };
export const LEAF: Artifact = {
  id: 'blank',
  name: 'Fallen Leaf',
  season: 'autumn',
  prizeSlot: null,
};

export const MIA: Me = { id: 'mod-1', name: 'Mia', role: 'organiser', rank: 0, badges: [] };
export const NOAH: Me = { id: 'mod-2', name: 'Noah', role: 'organiser', rank: 0, badges: [] };
export const ANA: Me = { id: 'ana', name: 'Ana', role: 'player', rank: 3, badges: [] };

function cases(count: number, opened: Record<number, Artifact>): CaseView[] {
  return Array.from({ length: count }, (_, i) => {
    const artifact = opened[i + 1] ?? null;
    return {
      number: i + 1,
      ownerId: `p${String(i + 1)}`,
      ownerName: i + 1 === 7 ? 'Ana' : `bot-${String(i + 1)}`,
      ownerBadges: [],
      ownerRank: i + 1 === 7 ? 3 : 1,
      opened: artifact !== null,
      artifact,
    };
  });
}

/**
 * A live show of 12 cases; case 7 (Ana's) is at the front at `step`. `taken` cases were opened
 * before and are back on the stage with their artifacts.
 */
export function liveView(
  step: RevealStep,
  artifact: Artifact = STONE,
  taken: Record<number, Artifact> = {},
): PublicShowView {
  const open = step === 'open' || step === 'owner';
  return {
    id: 'show-1',
    state: 'live',
    registrationOpen: false,
    createdAt: '2026-11-21T20:00:00.000Z',
    caseCount: 12,
    winnerCount: 2,
    prizeSlots: [
      { slot: 1, label: 'Gold' },
      { slot: 2, label: '' },
    ],
    artifactTable: [STONE, KEY, LEAF],
    cases: cases(12, open ? { ...taken, 7: artifact } : taken),
    board: null,
    commitment: 'c0ffee'.repeat(10) + 'beef',
    sealedAt: '2026-11-21T20:01:00.000Z',
    live: { begun: true, selected: step === 'idle' ? null : 7, step },
    season: 'autumn',
    allPrizesFound: false,
    result: null,
    presentation: DEFAULT_SETTINGS.presentation,
  };
}

export function organiserOf(show: PublicShowView, holder: Me): OrganiserView {
  return {
    show,
    holder: { id: holder.id, name: holder.name },
    organisers: [
      { id: MIA.id, name: MIA.name },
      { id: NOAH.id, name: NOAH.name },
    ],
  };
}

/** A show in registration: case 7 held by Bo (rank 4) with Ana (rank 3) also claiming it. */
export function registrationView(): PublicShowView {
  const show = liveView('idle');
  return {
    ...show,
    state: 'registration',
    registrationOpen: true,
    commitment: null,
    sealedAt: null,
    cases: show.cases.map((c) => ({ ...c, ownerId: null, ownerName: null, ownerRank: null })),
    board: show.cases.map((c) => ({
      number: c.number,
      holder:
        c.number === 7
          ? { playerId: 'bo', name: 'Bo', badges: [], rank: 4, at: '2026-11-21T20:00:05.000Z' }
          : c.number === 8
            ? { playerId: 'cy', name: 'Cy', badges: [], rank: 2, at: '2026-11-21T20:00:06.000Z' }
            : null,
      others:
        c.number === 7
          ? [{ playerId: 'ana', name: 'Ana', badges: [], rank: 3, at: '2026-11-21T20:00:09.000Z' }]
          : [],
    })),
  };
}

/** An ended show's result: two winners, three cases. */
export function resultOf(verified: boolean): ShowResult {
  return {
    winners: [
      { slot: 1, label: 'Gold', artifact: STONE, caseNumber: 4, ownerName: 'Ana' },
      { slot: 2, label: 'Prize 2', artifact: KEY, caseNumber: 9, ownerName: 'bot-9' },
    ],
    cases: [
      { number: 4, ownerName: 'Ana', artifact: STONE },
      { number: 5, ownerName: 'bot-5', artifact: { ...LEAF, id: 'blank-1' } },
      { number: 9, ownerName: 'bot-9', artifact: KEY },
    ],
    sealedAt: '2026-11-21T20:01:00.000Z',
    endedAt: '2026-11-21T20:30:00.000Z',
    commitment: '0123456789abcdef'.repeat(4),
    secret: 'ff'.repeat(32),
    assignment: [],
    verified,
  };
}
