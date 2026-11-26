/**
 * @file   apps/web/src/account/RecoveryReissue.tsx
 * @brief  New recovery codes for an admin whose two-factor sign-in is set up (DECISIONS D35).
 *
 * Responsibility: one card in the admin area: the password and a current code from the app,
 *                 then the ten new codes, shown once (./TwoFactorSetup.tsx `RecoveryCodeList`);
 *                 the old codes stop working at that moment, which the card says before asking.
 *                 The server checks both and decides.
 * Depends on:     react, @sc/contracts, ../lib/*, ../screens/fields.js, ./TwoFactorSetup.js
 */
import { PASSWORD_LIMIT, type RecoveryCodes, type RecoveryReissue } from '@sc/contracts';
import { useState } from 'react';

import { post } from '../lib/base.js';
import { useAction } from '../lib/useAction.js';
import { TextField } from '../screens/fields.js';
import { RecoveryCodeList } from './TwoFactorSetup.js';

// The password and the current code, sent once; the codes go to `onCodes`.
function ReissueForm({ onCodes }: { onCodes: (codes: readonly string[]) => void }) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const action = useAction();
  const body: RecoveryReissue = { password, code: code.trim() };
  return (
    <form
      aria-label="New recovery codes"
      onSubmit={(event) => {
        event.preventDefault();
        action.run(async () => {
          const answer = await post<RecoveryCodes>('/me/2fa/recovery', body);
          setPassword('');
          setCode('');
          onCodes(answer.recoveryCodes);
        });
      }}
    >
      <TextField
        label="Password"
        tip="Your password"
        type="password"
        maxLength={PASSWORD_LIMIT}
        required
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      <TextField
        label="Code"
        tip="The six digits your app shows now"
        maxLength={6}
        required
        autoComplete="one-time-code"
        value={code}
        onChange={setCode}
      />
      <button
        type="submit"
        className="sk-btn"
        disabled={action.busy}
        title="Make ten new codes; the old ones stop working"
      >
        Make new codes
      </button>
      {action.error !== null && <p role="alert">{action.error}</p>}
    </form>
  );
}

export function RecoveryReissue() {
  const [codes, setCodes] = useState<readonly string[] | null>(null);
  if (codes !== null) {
    return (
      <RecoveryCodeList
        codes={codes}
        onDone={() => {
          setCodes(null);
        }}
      />
    );
  }
  return (
    <section className="sk-panel two-factor" aria-label="New recovery codes">
      <h2>New recovery codes</h2>
      <p>Ten new codes replace your old ones; the old ones stop working at once.</p>
      <ReissueForm onCodes={setCodes} />
    </section>
  );
}
