/**
 * @file   apps/web/src/board/RegistrationBoard.tsx
 * @brief  The registration board: every case with its current holder, the other claimants, and
 *         for a player the "your rank is higher / lower" hint (CONCEPT §3.2).
 *
 * Responsibility: render the conflict view and the player's standings exactly as the server
 *                 sent them; a player picks or changes a case with one click. After the close the
 *                 board shows each case's owner. The screen scales down evenly and keeps the
 *                 dock's height free (DECISIONS D7); the cases sit in a named scroll area.
 * Depends on:     react, @seasonal/kit/react, @sc/contracts (types), @sc/ui, ./ArtifactTable.js
 */
import { useFitScale } from '@seasonal/kit/react';
import {
  ownerText,
  type BoardCase,
  type PersonalView,
  type PublicShowView,
  type Standing,
} from '@sc/contracts';
import { formatTime, useDockReserve } from '@sc/ui';
import type { CSSProperties } from 'react';

import { Badges } from '../stage/Badges.js';
import { ArtifactTable } from './ArtifactTable.js';

const HINTS: Record<Standing, string> = {
  yours: 'You hold this case',
  free: 'Free: you would take it',
  higher: 'Your rank is higher: you would take it',
  equal: 'Equal rank: the earlier pick holds',
  lower: 'Your rank is lower: the holder keeps it',
};

export interface BoardProps {
  readonly show: PublicShowView;
  readonly personal: PersonalView | null;
  // Present for a signed-in player while registration is open.
  readonly onClaim?: (caseNumber: number) => void;
  readonly error?: string | null;
}

function PickLine({ personal }: { personal: PersonalView | null }) {
  if (personal === null) return null;
  if (personal.claim === null) return <p className="board-pick">Pick a case: click it below.</p>;
  const state = personal.holds
    ? 'you hold it'
    : 'someone with a higher rank or an earlier pick holds it; pick another case';
  return (
    <p className={`board-pick${personal.holds ? ' is-holding' : ' is-losing'}`} role="status">
      Your pick: case {personal.claim}, {state}.
    </p>
  );
}

// Before the close a case without a holder is free; after it, nobody claimed it (D34).
function Claimants({ entry, closed }: { entry: BoardCase; closed: boolean }) {
  if (entry.holder === null) {
    return <span className="board-free">{closed ? ownerText(null) : 'free'}</span>;
  }
  return (
    <>
      <span className="board-holder" title={`Picked ${formatTime(entry.holder.at)}`}>
        <Badges badges={entry.holder.badges} />
        {entry.holder.name} <span className="board-rank">rank {entry.holder.rank}</span>
      </span>
      {entry.others.length > 0 && (
        <span className="board-others">
          also:{' '}
          {entry.others
            .map((o) => `${o.name} (rank ${String(o.rank)}, ${formatTime(o.at)})`)
            .join(', ')}
        </span>
      )}
    </>
  );
}

function BoardCaseCard({
  entry,
  standing,
  onClaim,
  closed,
}: {
  entry: BoardCase;
  standing: Standing | undefined;
  onClaim: ((caseNumber: number) => void) | undefined;
  closed: boolean;
}) {
  const body = (
    <>
      <span className="board-number show-font">{entry.number}</span>
      <Claimants entry={entry} closed={closed} />
      {standing !== undefined && (
        <span className={`board-hint hint-${standing}`}>{HINTS[standing]}</span>
      )}
    </>
  );
  return (
    <li className={`board-case${standing === 'yours' ? ' is-mine' : ''}`} data-case={entry.number}>
      {onClaim === undefined ? (
        <div className="board-case-body">{body}</div>
      ) : (
        <button
          type="button"
          className="board-case-body"
          title={`Pick case ${String(entry.number)}`}
          onClick={() => {
            onClaim(entry.number);
          }}
        >
          {body}
        </button>
      )}
    </li>
  );
}

/** After the close: the owner of each case. */
function owners(show: PublicShowView): BoardCase[] {
  return show.cases.map((c) => ({
    number: c.number,
    holder:
      c.ownerId === null || c.ownerName === null
        ? null
        : {
            playerId: c.ownerId,
            name: c.ownerName,
            badges: c.ownerBadges,
            rank: c.ownerRank ?? 0,
            at: show.createdAt,
          },
    others: [],
  }));
}

export function RegistrationBoard({ show, personal, onClaim, error }: BoardProps) {
  const reserve = useDockReserve();
  const fitRef = useFitScale<HTMLElement>(
    'mini-games',
    `${show.id}:${String(show.caseCount)}`,
    true,
  );
  const standings = new Map(personal?.standings.map((s) => [s.number, s.standing]) ?? []);
  const entries = show.board ?? owners(show);
  const style = { '--dock-reserve': `${String(reserve)}px` } as CSSProperties;
  return (
    <section
      className="board-screen"
      data-sk-game="cases"
      ref={fitRef}
      style={style}
      aria-label="Registration board"
    >
      <header className="board-head" data-fit-fixed>
        <h2>{show.registrationOpen ? 'Pick a case' : 'The cases and their owners'}</h2>
        <PickLine personal={show.registrationOpen ? personal : null} />
        {error !== null && error !== undefined && (
          <p className="board-error" role="alert">
            {error}
          </p>
        )}
      </header>
      <div className="board-scroll" role="region" aria-label="Cases" tabIndex={0} data-fit-fixed>
        <ol className="board-grid">
          {entries.map((entry) => (
            <BoardCaseCard
              key={entry.number}
              entry={entry}
              standing={standings.get(entry.number)}
              onClaim={onClaim}
              closed={show.board === null}
            />
          ))}
        </ol>
      </div>
      <ArtifactTable show={show} />
    </section>
  );
}
