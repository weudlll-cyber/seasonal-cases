/**
 * @file   apps/web/src/screens/OpeningShowcase.tsx
 * @brief  `/dev/opening`: the case's opening on its own, for the owner to look at (development
 *         only).
 *
 * Responsibility: the front case as the stage shows it (./../stage/CasePicture.tsx, the stage's
 *                 own classes and motion variables), with a sample artifact that belongs to no
 *                 show, so no show's content is ever involved. "Play the opening" plays it again
 *                 from the closed case; the speed slows it to see each phase (./../stage/
 *                 motion.ts); the season changes the trim and the lining. Beside it the closed
 *                 and the opened case as the stage's half circle shows them. Outside development
 *                 the page says it is not there; the server answers its path with 404 too
 *                 (apps/server/src/web.ts).
 *                 Loaded on demand by ../App.tsx in a development build only, with its own
 *                 stylesheet, so a production bundle has none of it (D63).
 * Depends on:     react, @sc/contracts (types), ../stage/*, ./showcase.css
 */
import './showcase.css';
import type { Artifact, Season } from '@sc/contracts';
import { useState } from 'react';

import { ArtifactEmblem } from '../stage/ArtifactEmblem.js';
import { CasePicture } from '../stage/CasePicture.js';
import { motionVars, STAGE_MOTION } from '../stage/motion.js';

// A sample, not a show's: the main prize's "all four seasons".
const SAMPLE: Artifact = { id: 'sample', name: 'Halving Stone', season: 'all', prizeSlot: 1 };
// Slower runs of the default opening, to see its phases one by one.
const SPEEDS = [
  { label: 'Normal', factor: 1 },
  { label: 'Half speed', factor: 2 },
  { label: 'Quarter speed', factor: 4 },
] as const;
const SEASONS: readonly Season[] = ['winter', 'spring', 'summer', 'autumn'];

interface ControlsProps {
  readonly factor: number;
  readonly season: Season;
  readonly onPlay: () => void;
  readonly onFactor: (factor: number) => void;
  readonly onSeason: (season: Season) => void;
}

/** Play, speed and season. */
function Controls({ factor, season, onPlay, onFactor, onSeason }: ControlsProps) {
  return (
    <div className="showcase-controls">
      <button
        type="button"
        className="sk-btn sk-btn--primary"
        title="Play the opening again from the closed case"
        onClick={() => {
          onPlay();
        }}
      >
        Play the opening
      </button>
      <label>
        Speed{' '}
        <select
          className="sk-select"
          value={factor}
          onChange={(event) => {
            onFactor(Number(event.target.value));
          }}
        >
          {SPEEDS.map((s) => (
            <option key={s.factor} value={s.factor}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Season{' '}
        <select
          className="sk-select"
          value={season}
          onChange={(event) => {
            onSeason(event.target.value as Season);
          }}
        >
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Showcase() {
  const [run, setRun] = useState(0);
  const [factor, setFactor] = useState<number>(1);
  const [season, setSeason] = useState<Season>('winter');
  const openMs = STAGE_MOTION.openMs * factor;
  return (
    <main className="page showcase">
      <h2>The opening</h2>
      <p>
        A development page: the case at the front opening over {String(openMs)} ms, with a sample
        artifact.
      </p>
      <Controls
        factor={factor}
        season={season}
        onPlay={() => {
          setRun((n) => n + 1);
        }}
        onFactor={setFactor}
        onSeason={setSeason}
      />
      <div
        className="stage-screen showcase-stage"
        data-season={season}
        style={motionVars({ ...STAGE_MOTION, openMs })}
      >
        <div className="centre" key={run} aria-label="The case at the front">
          <div className={`centre-case${run > 0 ? ' is-open' : ''}`}>
            <CasePicture state={run > 0 ? 'opening' : 'closed'} number={7} risen>
              {run > 0 ? <ArtifactEmblem artifact={SAMPLE} size="large" /> : undefined}
            </CasePicture>
          </div>
          {run > 0 && <p className="centre-meaning">Prize 1 · Gold</p>}
        </div>
        <ul className="showcase-states" aria-label="On the half circle">
          <li className="case-token">
            <CasePicture state="closed" number={3} />
            <span>closed</span>
          </li>
          <li className="case-token">
            <CasePicture state="open" number={5}>
              <ArtifactEmblem artifact={{ ...SAMPLE, season }} />
            </CasePicture>
            <span>opened</span>
          </li>
        </ul>
      </div>
    </main>
  );
}

/** The showcase in development; anywhere else the page is not there. */
export function OpeningShowcase({ dev }: { dev: boolean }) {
  if (!dev) return <p className="page">This page does not exist.</p>;
  return <Showcase />;
}
