/**
 * @file   apps/web/src/screens/SettingsAdmin.tsx
 * @brief  The settings in the admin area: every value of the catalogue, with its description,
 *         its limits and its warning (CONCEPT §9, DECISIONS D25).
 *
 * Responsibility: show the catalogue (@sc/contracts `SETTINGS_CATALOGUE`) as a form over the
 *                 current values, check the draft with the catalogue's own schema before sending,
 *                 and save it for new shows; shows that exist keep what they were created with.
 *                 The server checks the values and the admin's right again.
 * Depends on:     react, @sc/contracts, ../lib/*, ./fields.js, ./SettingsParts.js
 */
import { SettingsSchema, type Settings } from '@sc/contracts';
import { useEffect, useState } from 'react';

import { api, post } from '../lib/base.js';
import { useAction } from '../lib/useAction.js';
import { TextField } from './fields.js';
import { Artifacts, entry, Num, Setting } from './SettingsParts.js';

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
      <Num
        name="presentation.volume"
        value={draft.presentation.volume}
        onChange={(volume) => {
          motion({ volume });
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
    api<Settings>('/settings')
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
          setDraft(await post<Settings>('/admin/settings', draft));
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
