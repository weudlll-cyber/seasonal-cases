/**
 * @file   apps/web/src/screens/SettingsAdmin.tsx
 * @brief  The settings in the admin area: every value of the catalogue, with its description,
 *         its limits and its warning (CONCEPT §9, DECISIONS D25).
 *
 * Responsibility: show the catalogue (@sc/contracts `SETTINGS_CATALOGUE`) as a form over the
 *                 current values, check the draft with the catalogue's own schema before sending,
 *                 and save it for new shows; shows that exist keep what they were created with.
 *                 The server checks the values and the admin's right again.
 * Depends on:     react, @sc/contracts, ../lib/*, ./fields.js
 */
import {
  SEASONS,
  SETTINGS_CATALOGUE,
  SettingsSchema,
  type PrizeArtifact,
  type Settings,
} from '@sc/contracts';
import { useEffect, useState, type ReactNode } from 'react';

import { getJson, postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import { useAction } from '../lib/useAction.js';
import { ChoiceField, NumberField, TextField } from './fields.js';

const entry = (key: string) => SETTINGS_CATALOGUE.find((e) => e.key === key);
// Every season, 'all' (the main prize's four colours), 'none' (muted) and the show's own.
const SEASON_CHOICES: { value: PrizeArtifact['season']; text: string }[] = [
  ...SEASONS.map((s) => ({ value: s, text: s })),
  { value: 'all', text: 'all four' },
  { value: 'none', text: 'muted' },
  { value: 'current', text: 'the show’s season' },
];

/** One value with the catalogue's description and warning under it. */
function Setting({ name, children }: { name: string; children: ReactNode }) {
  const e = entry(name);
  return (
    <div className="setting" data-setting={name}>
      {children}
      {e !== undefined && <small>{e.description}</small>}
      {e?.warning !== undefined && <small className="setting-warning">{e.warning}</small>}
    </div>
  );
}

function Num({
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
        className="button"
        title="Add an artifact after the last"
        onClick={() => {
          onChange([...list, { name: `Artifact ${String(list.length + 1)}`, season: 'current' }]);
        }}
      >
        Add
      </button>
      <button
        type="button"
        className="button"
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

function Artifacts({
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

interface PartProps {
  readonly draft: Settings;
  readonly change: (c: Partial<Settings>) => void;
}

// The name of every further prize and of the empty case.
function Names({ draft, change }: PartProps) {
  return (
    <>
      <Setting name="relicName">
        <TextField
          label={entry('relicName')?.label ?? ''}
          tip="{n} becomes the prize number"
          maxLength={40}
          required
          value={draft.relicName}
          onChange={(relicName) => {
            change({ relicName });
          }}
        />
      </Setting>
      <Setting name="blankName">
        <TextField
          label={entry('blankName')?.label ?? ''}
          tip="The artifact of an empty case"
          maxLength={40}
          required
          value={draft.blankName}
          onChange={(blankName) => {
            change({ blankName });
          }}
        />
      </Setting>
    </>
  );
}

// The show's motion and confetti.
function Motion({ draft, change }: PartProps) {
  const motion = (c: Partial<Settings['presentation']>) => {
    change({ presentation: { ...draft.presentation, ...c } });
  };
  return (
    <>
      <Num
        name="presentation.travelMs"
        value={draft.presentation.travelMs}
        onChange={(travelMs) => {
          motion({ travelMs });
        }}
      />
      <Num
        name="presentation.openMs"
        value={draft.presentation.openMs}
        onChange={(openMs) => {
          motion({ openMs });
        }}
      />
      <Setting name="presentation.confetti">
        <label className="setting-check">
          <input
            type="checkbox"
            checked={draft.presentation.confetti}
            title="Confetti on the main prize"
            onChange={(e) => {
              motion({ confetti: e.target.checked });
            }}
          />
          {entry('presentation.confetti')?.label}
        </label>
      </Setting>
    </>
  );
}

function Fields({ draft, change }: PartProps) {
  return (
    <>
      <Num
        name="defaultCases"
        value={draft.defaultCases}
        onChange={(defaultCases) => {
          change({ defaultCases });
        }}
      />
      <Num
        name="defaultWinners"
        value={draft.defaultWinners}
        onChange={(defaultWinners) => {
          change({ defaultWinners });
        }}
      />
      <Artifacts
        list={draft.prizeArtifacts}
        onChange={(prizeArtifacts) => {
          change({ prizeArtifacts });
        }}
      />
      <Names draft={draft} change={change} />
      <Motion draft={draft} change={change} />
    </>
  );
}

export function SettingsAdmin() {
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const action = useAction();
  useEffect(() => {
    getJson<Settings>(apiPath('/settings'))
      .then(setDraft)
      .catch(() => undefined);
  }, []);
  if (draft === null) return null;
  const checked = SettingsSchema.safeParse(draft);
  const problem = checked.success ? null : (checked.error.issues[0]?.message ?? 'not valid');
  return (
    <form
      className="card settings-admin"
      aria-label="Settings"
      onSubmit={(event) => {
        event.preventDefault();
        action.run(async () => {
          setDraft(await postJson<Settings>(apiPath('/admin/settings'), draft));
          setSaved(true);
        });
      }}
    >
      <h2>Settings</h2>
      <p>Changes apply to new shows; a show keeps the values it was created with.</p>
      <Fields
        draft={draft}
        change={(c) => {
          setSaved(false);
          setDraft({ ...draft, ...c });
        }}
      />
      <button
        type="submit"
        className="button button-solid"
        disabled={action.busy || problem !== null}
        title="Save the settings for new shows"
      >
        Save settings
      </button>
      {problem !== null && <p role="alert">{problem}</p>}
      {saved && <p role="status">Saved. New shows use these values.</p>}
      {action.error !== null && <p role="alert">{action.error}</p>}
    </form>
  );
}
