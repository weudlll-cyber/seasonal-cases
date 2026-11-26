/**
 * @file   apps/web/src/screens/SettingsParts.tsx
 * @brief  The settings form's parts: one value with its description and warning, a number, and
 *         the list of prize artifacts.
 *
 * Responsibility: show a catalogue entry (@sc/contracts `SETTINGS_CATALOGUE`) as a field with
 *                 its words, and edit the prize artifacts in order, each with its season colour
 *                 (add one after the last, remove the last; one stays). ./SettingsAdmin.tsx holds
 *                 the form.
 * Depends on:     react, @sc/contracts, ./fields.js
 */
import { SEASONS, SETTINGS_CATALOGUE, type PrizeArtifact } from '@sc/contracts';
import type { ReactNode } from 'react';

import { ChoiceField, NumberField, TextField } from './fields.js';

export const entry = (key: string) => SETTINGS_CATALOGUE.find((e) => e.key === key);
// Every season, 'all' (the main prize's four colours), 'none' (muted) and the show's own.
const SEASON_CHOICES: { value: PrizeArtifact['season']; text: string }[] = [
  ...SEASONS.map((s) => ({ value: s, text: s })),
  { value: 'all', text: 'all four' },
  { value: 'none', text: 'muted' },
  { value: 'current', text: 'the show’s season' },
];

/** One value with the catalogue's description and warning under it. */
export function Setting({ name, children }: { name: string; children: ReactNode }) {
  const e = entry(name);
  return (
    <div className="setting" data-setting={name}>
      {children}
      {e !== undefined && <small>{e.description}</small>}
      {e?.warning !== undefined && <small className="setting-warning">{e.warning}</small>}
    </div>
  );
}

export function Num({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const e = entry(name);
  return (
    <Setting name={name}>
      <NumberField
        label={e?.label ?? name}
        tip={e?.description ?? ''}
        min={e?.min ?? 0}
        max={e?.max ?? 99_999}
        value={value}
        onChange={onChange}
      />
    </Setting>
  );
}

// Add an artifact after the last, or take the last away (one stays).
function ListButtons({
  list,
  onChange,
}: {
  list: readonly PrizeArtifact[];
  onChange: (l: PrizeArtifact[]) => void;
}) {
  return (
    <span className="admin-buttons">
      <button
        type="button"
        className="sk-btn"
        title="Add an artifact after the last"
        onClick={() => {
          onChange([...list, { name: `Artifact ${String(list.length + 1)}`, season: 'current' }]);
        }}
      >
        Add
      </button>
      <button
        type="button"
        className="sk-btn"
        title="Remove the last artifact"
        disabled={list.length <= 1}
        onClick={() => {
          onChange(list.slice(0, -1));
        }}
      >
        Remove last
      </button>
    </span>
  );
}

export function Artifacts({
  list,
  onChange,
}: {
  list: readonly PrizeArtifact[];
  onChange: (l: PrizeArtifact[]) => void;
}) {
  const set = (i: number, change: Partial<PrizeArtifact>) => {
    onChange(list.map((a, j) => (j === i ? { ...a, ...change } : a)));
  };
  return (
    <Setting name="prizeArtifacts">
      <fieldset className="admin-labels">
        <legend>{entry('prizeArtifacts')?.label}</legend>
        {list.map((a, i) => (
          <span key={i} className="setting-artifact">
            <TextField
              label={`Prize ${String(i + 1)}`}
              tip="The artifact's name"
              maxLength={40}
              required
              value={a.name}
              onChange={(name) => {
                set(i, { name });
              }}
            />
            <ChoiceField
              label="Season"
              tip="The artifact's colour"
              value={a.season}
              choices={SEASON_CHOICES}
              onChange={(season) => {
                set(i, { season });
              }}
            />
          </span>
        ))}
        <ListButtons list={list} onChange={onChange} />
      </fieldset>
    </Setting>
  );
}
