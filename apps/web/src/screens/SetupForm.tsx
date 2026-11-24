/**
 * @file   apps/web/src/screens/SetupForm.tsx
 * @brief  The admin area's setup form: N cases, W winners, one label per prize, a slot for the
 *         development-only Quick Test (./QuickTestParts.tsx), and the button Create show.
 *
 * Responsibility: collect a setup; the server checks its limits (2 ≤ N ≤ 99, 1 ≤ W ≤ N). It
 *                 starts from the settings' defaults (D25; the catalogue's are the concept's
 *                 proposal N = 24, W = 3, CONCEPT §3.1, §14). "Show on the website" lists the
 *                 open registration among the website's open sign-ups (OPEN-ROUNDS.md). The Quick
 *                 Test is not part of this file: the admin hands in `quick`, a development build's
 *                 parts, so a production bundle has none of its words (D63).
 * Depends on:     react, @sc/contracts, ./fields.js
 */
import { DEFAULT_SETTINGS } from '@sc/contracts';
import { useState, type ReactNode } from 'react';

import { NumberField, TextField } from './fields.js';

export interface Setup {
  readonly cases: number;
  readonly winners: number;
  readonly labels: string[];
  // Listed on the website's open sign-ups while registration is open (OPEN-ROUNDS.md).
  readonly listed: boolean;
}

export interface SetupFormProps {
  readonly busy: boolean;
  // The Quick Test's seed field and button, in a development build only (absent otherwise).
  readonly quick?: (setup: Setup) => ReactNode;
  readonly onCreate: (setup: Setup) => void;
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

export function SetupForm({ busy, quick, onCreate, defaults = START }: SetupFormProps) {
  const [cases, setCases] = useState(defaults.cases);
  const [winners, setWinners] = useState(defaults.winners);
  const [labels, setLabels] = useState<string[]>([]);
  const [listed, setListed] = useState(false);
  const slots = Math.max(0, Math.min(winners, 99));
  const current = Array.from({ length: slots }, (_, i) => labels[i] ?? '');
  const setLabel = (i: number, label: string) => {
    const next = [...current];
    next[i] = label;
    setLabels(next);
  };
  const setup = { cases, winners, labels: current, listed };
  return (
    <form
      className="card admin-setup"
      aria-label="Show setup"
      onSubmit={(event) => {
        event.preventDefault();
        onCreate(setup);
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
      <ListedField listed={listed} onChange={setListed} />
      {quick?.(setup)}
      <SetupButtons
        busy={busy}
        onCreate={() => {
          onCreate(setup);
        }}
      />
    </form>
  );
}

/** The organiser's mark for the website's open sign-ups. */
function ListedField({ listed, onChange }: { listed: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="setting-check">
      <input
        type="checkbox"
        checked={listed}
        title="While registration is open, the website lists this show among its open sign-ups"
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
      Show on the website
    </label>
  );
}

/** "Create show" creates a show in setup; the Quick Test (development) has its own button. */
function SetupButtons({ busy, onCreate }: { busy: boolean; onCreate: () => void }) {
  return (
    <span className="admin-buttons">
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
