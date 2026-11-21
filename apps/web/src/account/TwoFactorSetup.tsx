/**
 * @file   apps/web/src/account/TwoFactorSetup.tsx
 * @brief  Setting up two-factor sign-in in the admin area, for a standalone admin who has none.
 *
 * Responsibility: three steps on one card: start (the server draws a secret), add it to an
 *                 authenticator app (the secret as text and as an otpauth:// link) and type the
 *                 code it shows, then the ten recovery codes, shown once, with the request to keep
 *                 them. The admin's account list appears once it is enabled (`onEnabled`).
 * Depends on:     react, @sc/contracts (types), ../lib/*, ../screens/fields.js
 */
import type { RecoveryCodes, TwoFactorSetup as Setup } from '@sc/contracts';
import { useState } from 'react';

import { postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import { useAction } from '../lib/useAction.js';
import { TextField } from '../screens/fields.js';

function Codes({ codes, onDone }: { codes: readonly string[]; onDone: () => void }) {
  return (
    <section className="card two-factor" aria-label="Recovery codes">
      <h2>Your recovery codes</h2>
      <p>
        Keep these ten codes somewhere safe, away from your phone. Each one signs you in once
        without the app. They are shown only now.
      </p>
      <ul className="recovery-codes">
        {codes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ul>
      <button type="button" className="button button-solid" title="Continue" onClick={onDone}>
        I have saved them
      </button>
    </section>
  );
}

interface ConfirmProps {
  readonly setup: Setup;
  readonly busy: boolean;
  readonly run: (action: () => Promise<unknown>) => void;
  readonly onCodes: (codes: readonly string[]) => void;
}

// The key for the app, and the code that proves the app has it.
function ConfirmForm({ setup, busy, run, onCodes }: ConfirmProps) {
  const [code, setCode] = useState('');
  return (
    <form
      aria-label="Confirm two-factor sign-in"
      onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          const answer = await postJson<RecoveryCodes>(apiPath('/me/2fa/confirm'), { code });
          onCodes(answer.recoveryCodes);
        });
      }}
    >
      <p>
        Add this key to your authenticator app, or open <a href={setup.uri}>the setup link</a> on
        your phone:
      </p>
      <p>
        <code className="two-factor-secret">{setup.secret}</code>
      </p>
      <TextField
        label="Code"
        tip="The six digits your app shows now"
        maxLength={6}
        required
        autoComplete="one-time-code"
        value={code}
        onChange={setCode}
      />
      <button type="submit" className="button button-solid" disabled={busy} title="Turn it on">
        Confirm
      </button>
    </form>
  );
}

export function TwoFactorSetup({ onEnabled }: { onEnabled: () => void }) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codes, setCodes] = useState<readonly string[] | null>(null);
  const action = useAction();
  if (codes !== null) return <Codes codes={codes} onDone={onEnabled} />;
  return (
    <section className="card two-factor" aria-label="Two-factor sign-in">
      <h2>Two-factor sign-in</h2>
      <p>An admin signs in with a password and a code from an authenticator app.</p>
      {setup === null ? (
        <button
          type="button"
          className="button button-solid"
          disabled={action.busy}
          title="Draw a new secret for your authenticator app"
          onClick={() => {
            action.run(async () => {
              setSetup(await postJson<Setup>(apiPath('/me/2fa/setup')));
            });
          }}
        >
          Set up
        </button>
      ) : (
        <ConfirmForm setup={setup} busy={action.busy} run={action.run} onCodes={setCodes} />
      )}
      {action.error !== null && <p role="alert">{action.error}</p>}
    </section>
  );
}
