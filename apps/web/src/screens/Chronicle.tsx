/**
 * @file   apps/web/src/screens/Chronicle.tsx
 * @brief  `/chronicle`: the past shows with their winners and prizes (CONCEPT §3.5).
 *
 * Responsibility: one card per ended show, newest first: when it ended, its winners (prize,
 *                 artifact, owner, case) and its proof (commitment, verified), with the way to its
 *                 full result. Everything comes from the server's chronicle, which holds only ended
 *                 shows, so nothing here was ever hidden.
 * Depends on:     react, @sc/contracts (types), @sc/ui, ../lib/*, ../stage/ArtifactEmblem.js
 */
import { prizeName, winnerText, type ChronicleEntry } from '@sc/contracts';
import { formatTime, shortCommitment } from '@sc/ui';
import { useEffect, useState } from 'react';

import { api } from '../lib/base.js';
import { Link } from '../lib/router.js';
import { ArtifactEmblem } from '../stage/ArtifactEmblem.js';

function Entry({ entry }: { entry: ChronicleEntry }) {
  return (
    <article className="card chronicle-entry" aria-label={`Show of ${formatTime(entry.endedAt)}`}>
      <h2>{formatTime(entry.endedAt)}</h2>
      <ol className="chronicle-winners">
        {entry.winners.map((w) => (
          <li key={w.slot}>
            <span className="result-slot">{prizeName(w.slot, w.label)}</span>
            <ArtifactEmblem artifact={w.artifact} />
            <span className="result-owner">{winnerText(w.ownerName)}</span>
            <span>case {w.caseNumber}</span>
          </li>
        ))}
      </ol>
      <p className="chronicle-proof">
        {entry.caseCount} cases · commitment {shortCommitment(entry.commitment)} ·{' '}
        {entry.verified ? 'verified' : 'NOT verified'} ·{' '}
        <Link to={`/results/${entry.id}`}>Full result</Link>
      </p>
    </article>
  );
}

export function Chronicle() {
  const [entries, setEntries] = useState<ChronicleEntry[] | null>(null);
  useEffect(() => {
    api<ChronicleEntry[]>('/chronicle')
      .then(setEntries)
      .catch(() => {
        setEntries([]);
      });
  }, []);
  return (
    <main className="page chronicle">
      <h1>Chronicle</h1>
      {entries?.length === 0 && <p className="card">No show has ended yet.</p>}
      {(entries ?? []).map((e) => (
        <Entry key={e.id} entry={e} />
      ))}
    </main>
  );
}
