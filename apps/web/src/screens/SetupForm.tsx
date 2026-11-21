/**
 * @file   apps/web/src/screens/SetupForm.tsx
 * @brief  The admin area's setup form: N cases, W winners, one label per prize, the Quick Test
 *         seed (development), and the buttons Quick Test and Create show.
 *
 * Responsibility: collect a setup; the server checks its limits (2 ≤ N ≤ 99, 1 ≤ W ≤ N). It
 *                 starts from the settings' defaults (D25; the catalogue's are the concept's
 *                 proposal N = 24, W = 3, CONCEPT §3.1, §14).
 * Depends on:     react, @sc/contracts, ./fields.js
 */
import { DEFAULT_SETTINGS } from '@sc/contracts';
import { useState } from 'react';

import { NumberField, TextField } from './fields.js';

export interface Setup {
  readonly cases: number;
  readonly winners: number;
  readonly labels: string[];
  readonly seed: string;
}

export interface SetupFormProps {
  readonly busy: boolean;
  // Present in development only: without it there is no seed field and no Quick Test.
  readonly onQuickTest?: (setup: Setup) => void;
  readonly onCreate: (setup: Omit<Setup, 'seed'>) => void;
  // The settings' default N and W.
  readonly defaults?: { readonly cases: number; readonly winners: number };
}

const START = {
  cases: DEFAULT_SETTINGS.defaultCases,
  winners: DEFAULT_SETTINGS.defaultWinners,
};

/** One optional label per prize slot; empty ones are shown as "Prize n". */
function PrizeLabels({
  labels,
  onChange,
}: {
  labels: readonly string[];
  onChange: (slotIndex: number, label: string) => void;
}) {
  return (
    <fieldset className="admin-labels">
      <legend>Prize labels (optional)</legend>
      {labels.map((label, i) => (
        <TextField
          key={i}
          label={`Prize ${String(i + 1)}`}
          tip={`Label of prize ${String(i + 1)}; empty shows "Prize ${String(i + 1)}"`}
          placeholder={`Prize ${String(i + 1)}`}
          maxLength={60}
          value={label}
          onChange={(v) => {
            onChange(i, v);
          }}
        />
      ))}
    </fieldset>
  );
}

export function SetupForm({ busy, onQuickTest, onCreate, defaults = START }: SetupFormProps) {
  const [cases, setCases] = useState(defaults.cases);
  const [winners, setWinners] = useState(defaults.winners);
  const [labels, setLabels] = useState<string[]>([]);
  const [seed, setSeed] = useState('sc-n1-01');
  const slots = Math.max(0, Math.min(winners, 99));
  const current = Array.from({ length: slots }, (_, i) => labels[i] ?? '');
  const setLabel = (i: number, label: string) => {
    const next = [...current];
    next[i] = label;
    setLabels(next);
  };
  return (
    <form
      className="card admin-setup"
      aria-label="Show setup"
      onSubmit={(event) => {
        event.preventDefault();
        if (onQuickTest === undefined) onCreate({ cases, winners, labels: current });
        else onQuickTest({ cases, winners, labels: current, seed });
      }}
    >
      <NumberField
        label="Cases (N)"
        tip="Number of cases, 2 to 99"
        value={cases}
        min={2}
        max={99}
        onChange={setCases}
      />
      <NumberField
        label="Winners (W)"
        tip="Number of prizes, 1 to the number of cases"
        value={winners}
        min={1}
        max={cases}
        onChange={setWinners}
      />
      <PrizeLabels labels={current} onChange={setLabel} />
      {onQuickTest !== undefined && (
        <TextField
          label="Quick Test seed"
          tip="The same seed gives the same bots and the same sealing"
          maxLength={64}
          required
          value={seed}
          onChange={setSeed}
        />
      )}
      <SetupButtons
        busy={busy}
        quickTest={onQuickTest !== undefined}
        onCreate={() => {
          onCreate({ cases, winners, labels: current });
        }}
      />
    </form>
  );
}

/** "Quick Test" (development) submits the form; "Create show" only creates. */
function SetupButtons(props: { busy: boolean; quickTest: boolean; onCreate: () => void }) {
  const { busy, quickTest, onCreate } = props;
  return (
    <span className="admin-buttons">
      {quickTest && (
        <button
          type="submit"
          className="button button-solid"
          disabled={busy}
          title="Create, fill with bots, seal and start a show from the seed; you hold the direction"
        >
          Quick Test
        </button>
      )}
      <button
        type="button"
        className="button"
        disabled={busy}
        title="Create a show in setup; open its registration below"
        onClick={onCreate}
      >
        Create show
      </button>
    </span>
  );
}
