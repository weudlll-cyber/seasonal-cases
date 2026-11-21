/**
 * @file   apps/web/src/account/ResetPage.tsx
 * @brief  `/reset?token=…`: the page the forgotten-password mail links to.
 *
 * Responsibility: one new password for the token in the address; the server takes the token
 *                 once, checks the rules and ends every session of the account. Afterwards the
 *                 page sends the user to the start page to sign in with the new password.
 * Depends on:     react, @sc/contracts, ../lib/*, ../screens/fields.js
 */
import { PASSWORD_LIMIT, type ResetRequest } from '@sc/contracts';
import { useState } from 'react';

import { postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import { Link } from '../lib/router.js';
import { useAction } from '../lib/useAction.js';
import { TextField } from '../screens/fields.js';

export function ResetPage() {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const action = useAction();
  const body: ResetRequest = { token, password };
  if (done) {
    return (
      <main className="page">
        <p className="card" role="status">
          Your new password is set. <Link to="/">Sign in</Link>
        </p>
      </main>
    );
  }
  return (
    <main className="page">
      <form
        className="card sign-in"
        aria-label="Choose a new password"
        onSubmit={(event) => {
          event.preventDefault();
          action.run(async () => {
            await postJson(apiPath('/auth/reset'), body);
            setDone(true);
          });
        }}
      >
        <h2>Choose a new password</h2>
        <TextField
          label="New password"
          tip="At least 12 characters"
          type="password"
          maxLength={PASSWORD_LIMIT}
          required
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <button
          type="submit"
          className="button button-solid"
          disabled={action.busy || token === ''}
          title="Set the new password"
        >
          Set password
        </button>
        {action.error !== null && <p role="alert">{action.error}</p>}
      </form>
    </main>
  );
}
