/**
 * @file   apps/web/src/account/AccountPage.tsx
 * @brief  `/account`: the signed-in player's own data, downloaded or deleted (DECISIONS D61).
 *
 * Responsibility: show the profile, offer "Download my data" (a JSON file the server builds from the
 *                 account's own records) and "Delete my account": the password, and a current code
 *                 when the account has a second factor, then a last confirmation. After the
 *                 deletion the shows keep "deleted player" and the page signs the browser out.
 *                 A website member's account belongs to the website: the page says so and links to
 *                 the privacy page; it offers no button the server would refuse. The server checks
 *                 everything again; a refusal (wrong password, the last admin) is shown as the
 *                 sentence it comes with.
 * Depends on:     react, @sc/contracts, ../lib/api.js, ../lib/base.js, ../lib/router.js,
 *                 ../lib/useAction.js, ../screens/fields.js, ./account.css
 */
import { PASSWORD_LIMIT, type DeleteAccountRequest, type Me } from '@sc/contracts';
import { useEffect, useState } from 'react';

import { getJson, postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import { Link } from '../lib/router.js';
import { useAction } from '../lib/useAction.js';
import { TextField } from '../screens/fields.js';
import './account.css';

interface AccountPageProps {
  readonly me: Me | null;
  readonly website: boolean;
  // Called once the account is gone: the browser forgets the session.
  readonly onGone: () => Promise<void>;
}

/** Whether the second factor's code is asked: the server says so for this account. */
function useSecondFactor(open: boolean): boolean {
  const [second, setSecond] = useState(false);
  useEffect(() => {
    if (!open) return;
    getJson<{ enabled: boolean }>(apiPath('/me/2fa'))
      .then((answer) => {
        setSecond(answer.enabled);
      })
      .catch(() => {
        setSecond(false);
      });
  }, [open]);
  return second;
}

interface FieldsProps {
  readonly second: boolean;
  readonly password: string;
  readonly code: string;
  readonly onPassword: (value: string) => void;
  readonly onCode: (value: string) => void;
}

function DeleteFields({ second, password, code, onPassword, onCode }: FieldsProps) {
  return (
    <>
      <TextField
        label="Password"
        tip="The password of this account"
        type="password"
        autoComplete="current-password"
        required
        maxLength={PASSWORD_LIMIT}
        value={password}
        onChange={onPassword}
      />
      {second && (
        <TextField
          label="Code of your second factor"
          tip="A current code of your authenticator, or a recovery code"
          autoComplete="one-time-code"
          required
          maxLength={32}
          value={code}
          onChange={onCode}
        />
      )}
    </>
  );
}

function DeleteActions({ busy, onCancel }: { busy: boolean; onCancel: () => void }) {
  return (
    <div className="account-actions">
      <button type="submit" className="button danger" disabled={busy}>
        Delete my account for good
      </button>
      <button type="button" className="button" onClick={onCancel}>
        Keep my account
      </button>
    </div>
  );
}

function DeleteForm({ onGone }: { onGone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const second = useSecondFactor(open);
  const action = useAction();
  if (!open) {
    return (
      <button
        type="button"
        className="button danger"
        onClick={() => {
          setOpen(true);
        }}
      >
        Delete my account
      </button>
    );
  }
  const body: DeleteAccountRequest = { password, ...(second ? { code: code.trim() } : {}) };
  return (
    <form
      aria-label="Delete my account"
      className="account-delete"
      onSubmit={(event) => {
        event.preventDefault();
        action.run(async () => {
          await postJson(apiPath('/me/delete'), body);
          await onGone();
        });
      }}
    >
      <p>
        This removes your name, e-mail, password and sign-ins for good. Past shows keep your case,
        shown as &quot;deleted player&quot;. It cannot be undone.
      </p>
      <DeleteFields
        second={second}
        password={password}
        code={code}
        onPassword={setPassword}
        onCode={setCode}
      />
      <DeleteActions
        busy={action.busy}
        onCancel={() => {
          setOpen(false);
        }}
      />
      {action.error !== null && <p role="alert">{action.error}</p>}
    </form>
  );
}

export function AccountPage({ me, website, onGone }: AccountPageProps) {
  if (me === null) return <p className="page card">Sign in to see your account.</p>;
  return (
    <main className="page">
      <section className="card" aria-label="My account">
        <h1>My account</h1>
        <p>
          {me.name} ({me.role === 'player' ? `player · rank ${String(me.rank)}` : me.role})
        </p>
        {website ? (
          <p>
            Your account belongs to the website: delete or download your data there. Past shows show
            &quot;deleted player&quot; once it is gone. <Link to="/privacy">Privacy</Link>
          </p>
        ) : (
          <>
            {/* A plain GET the browser saves (the server names the file); a button like the other. */}
            <form action={apiPath('/me/export')} method="get">
              <button type="submit" className="button">
                Download my data
              </button>
            </form>
            <DeleteForm onGone={onGone} />
            <p>
              <Link to="/privacy">What is stored, and why</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
