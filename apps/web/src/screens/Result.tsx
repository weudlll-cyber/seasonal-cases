/**
 * @file   apps/web/src/screens/Result.tsx
 * @brief  The result page (`/results/<id>`) on the kit's result frame (CONCEPT §3.5, D22).
 *
 * Responsibility: the frame's headline "The winners", the winners as its placings (slot, label,
 *                 artifact, owner, case), the proof line "sealed at <time> · commitment <first 12
 *                 hex> · verified", the reveal of every case as its reveal part, and the full list
 *                 with the owners as `more`. The server checked the commitment; the client shows
 *                 its answer as it came. While the website's shared call is live, the kit's
 *                 "Back to the call" stands under the headline (D91).
 * Depends on:     react, @seasonal/kit/react, @sc/contracts, @sc/ui,
 *                 ../lib/base.js, ../lib/useAction.js, ../stage/ArtifactEmblem.js
 */
import { BackToCall, ResultFrame } from '@seasonal/kit/react';
import {
  ownerText,
  prizeName,
  winnerText,
  type PublicShowView,
  type ShowResult,
} from '@sc/contracts';
import { formatTime, shortCommitment } from '@sc/ui';
import { useEffect, useState } from 'react';

import { api } from '../lib/base.js';
import { sentenceOf } from '../lib/useAction.js';
import { ArtifactEmblem } from '../stage/ArtifactEmblem.js';

function Placings({ result }: { result: ShowResult }) {
  return (
    <ol className="result-winners">
      {result.winners.map((w) => (
        <li key={w.slot}>
          <span className="result-slot">{prizeName(w.slot, w.label)}</span>
          <ArtifactEmblem artifact={w.artifact} />
          <span className="result-owner">{winnerText(w.ownerName)}</span>
          <span className="result-case">case {w.caseNumber}</span>
        </li>
      ))}
    </ol>
  );
}

function Proof({ result }: { result: ShowResult }) {
  return (
    <p className="result-seal" title={`Commitment ${result.commitment}, secret ${result.secret}`}>
      sealed at {formatTime(result.sealedAt)} · commitment{' '}
      <span className="commitment" data-commitment={result.commitment}>
        {shortCommitment(result.commitment)}
      </span>{' '}
      · {result.verified ? 'verified' : 'NOT verified'}
    </p>
  );
}

/** Every case's number and artifact: the reveal. */
function Reveal({ result }: { result: ShowResult }) {
  return (
    <ol className="result-reveal" aria-label="Every case">
      {result.cases.map((c) => (
        <li key={c.number} className={c.artifact.prizeSlot === null ? '' : 'is-prize'}>
          <span className="result-number show-font">{c.number}</span>
          <ArtifactEmblem artifact={c.artifact} />
        </li>
      ))}
    </ol>
  );
}

function AllCases({ result }: { result: ShowResult }) {
  return (
    <section aria-label="All cases">
      <h2>All cases</h2>
      <ol className="result-cases">
        {result.cases.map((c) => (
          <li key={c.number}>
            <span className="result-number show-font">{c.number}</span>
            <span className="result-case-owner">{ownerText(c.ownerName)}</span>
            <ArtifactEmblem artifact={c.artifact} />
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ResultView({ result, call }: { result: ShowResult; call: number | null }) {
  return (
    <main className="page result-page" data-sk-game="cases">
      <ResultFrame
        game="mini-games"
        headline="The winners"
        lines={<BackToCall callId={call} className="sk-btn result-call" />}
        proof={<Proof result={result} />}
        reveal={<Reveal result={result} />}
        placings={<Placings result={result} />}
        more={<AllCases result={result} />}
        signature={String(result.cases.length)}
      />
    </main>
  );
}

export function Result({ showId, call }: { showId: string; call: number | null }) {
  const [show, setShow] = useState<PublicShowView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<PublicShowView>(`/shows/${showId}`)
      .then(setShow)
      .catch((e: unknown) => {
        setError(sentenceOf(e));
      });
  }, [showId]);
  if (error !== null) return <p className="page sk-panel">{error}</p>;
  if (show === null) return <p className="page">Loading…</p>;
  if (show.result === null) return <p className="page sk-panel">This show has not ended yet.</p>;
  return <ResultView result={show.result} call={call} />;
}
