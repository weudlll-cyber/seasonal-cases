/**
 * @file   apps/web/src/account/ConfirmPage.tsx
 * @brief  `/confirm?token=…`: the page the registration mail links to (DECISIONS D42).
 *
 * Responsibility: one button makes the account from the token in the address; the server takes
 *                 the token once. A press, not the page's load, so a mail program that opens
 *                 links to look at them makes nothing. Afterwards the page names the account and
 *                 sends the user to the start page to sign in with the password they chose; a
 *                 used or expired link, or a name taken in the meantime, shows the server's
 *                 sentence.
 * Depends on:     react, @sc/contracts, ../lib/*
 */
import type { ConfirmRequest, ConfirmResult } from '@sc/contracts';
import { useState } from 'react';

import { postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import { Link } from '../lib/router.js';
import { useAction } from '../lib/useAction.js';

export function ConfirmPage() {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [made, setMade] = useState<string | null>(null);
  const action = useAction();
  const body: ConfirmRequest = { token };
  if (made !== null) {
    return (
      <main className="page">
        <p className="card" role="status">
          Your account {made} is ready. <Link to="/">Sign in</Link> with your name or e-mail and
          your password.
        </p>
      </main>
    );
  }
  return (
    <main className="page">
      <section className="card sign-in" aria-label="Confirm your account">
        <h2>Confirm your account</h2>
        <p>One press makes the account you registered.</p>
        <button
          type="button"
          className="button button-solid"
          disabled={action.busy || token === ''}
          title="Make the account"
          onClick={() => {
            action.run(async () => {
              const result = await postJson<ConfirmResult>(apiPath('/auth/confirm'), body);
              setMade(result.name);
            });
          }}
        >
          Confirm
        </button>
        {action.error !== null && <p role="alert">{action.error}</p>}
      </section>
    </main>
  );
}
