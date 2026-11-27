/**
 * @file   apps/web/src/account/AccountEntry.tsx
 * @brief  The way in for a guest in local mode: sign in, register, or ask for a new password.
 *
 * Responsibility: three small forms behind one switch (DECISIONS D24). Sign-in takes the name
 *                 or the e-mail, and asks for the second factor when the server wants it (an
 *                 admin with two-factor sign-in); registration a name, an e-mail and a password,
 *                 with the rules shown before sending, answered alike for every e-mail and
 *                 signing nobody in: a mail says the rest (D36); the forgotten password always
 *                 answers the same sentence.
 *                 A Privacy link sits under every form (D61).
 *                 The server checks everything again and answers each refusal in one sentence.
 * Depends on:     react, @sc/contracts, ../lib/base.js, ../lib/router.js, ../lib/useAction.js,
 *                 ../screens/fields.js
 */
import {
  EMAIL_MAX,
  NAME_TEXT,
  PASSWORD_LIMIT,
  type ForgotRequest,
  type LocalSignInRequest,
  type Me,
  type RegisterRequest,
  type TwoFactorNeeded,
} from '@sc/contracts';
import { useState } from 'react';

import { post } from '../lib/base.js';
import { Link } from '../lib/router.js';
import { useAction } from '../lib/useAction.js';
import { TextField } from '../screens/fields.js';
import './account.css';

type Form = 'sign-in' | 'register' | 'forgot';

const TITLES: Record<Form, string> = {
  'sign-in': 'Sign in',
  register: 'Create an account',
  forgot: 'Forgotten password',
};

const PASSWORD_TIP = 'At least 12 characters; a long sentence is easy to remember';

/** A form's one button: the kit's solid pill, off while its call runs. */
function Submit({ busy, tip, label }: { busy: boolean; tip: string; label: string }) {
  return (
    <button type="submit" className="sk-btn sk-btn--primary" disabled={busy} title={tip}>
      {label}
    </button>
  );
}

function SignInForm({ onEnter }: { onEnter: (me: Me) => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  // Asked once the server says the account has two-factor sign-in (an admin).
  const [code, setCode] = useState<string | null>(null);
  const action = useAction();
  const body: LocalSignInRequest = {
    login: login.trim(),
    password,
    ...(code === null ? {} : { code: code.trim() }),
  };
  return (
    <form
      aria-label="Sign in"
      onSubmit={(event) => {
        event.preventDefault();
        action.run(async () => {
          const answer = await post<Me | TwoFactorNeeded>('/auth/sign-in', body);
          if ('twoFactor' in answer) setCode('');
          else onEnter(answer);
        });
      }}
    >
      <TextField
        label="Name or e-mail"
        tip="The name or the e-mail of your account"
        maxLength={EMAIL_MAX}
        required
        autoComplete="username"
        value={login}
        onChange={setLogin}
      />
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
      {code !== null && (
        <TextField
          label="Code"
          tip="The six digits of your authenticator app, or one of your recovery codes"
          maxLength={20}
          required
          autoComplete="one-time-code"
          value={code}
          onChange={setCode}
        />
      )}
      <Submit busy={action.busy} tip="Sign in" label="Sign in" />
      {action.error !== null && <p role="alert">{action.error}</p>}
    </form>
  );
}

// Registration signs nobody in and answers alike for every e-mail; the mail says the rest (D36).
function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const action = useAction();
  const body: RegisterRequest = { name: name.trim(), email: email.trim(), password };
  return (
    <form
      aria-label="Create an account"
      onSubmit={(event) => {
        event.preventDefault();
        action.run(async () => {
          await post('/auth/register', body);
          setSent(true);
        });
      }}
    >
      <TextField
        label="Name"
        tip={NAME_TEXT}
        maxLength={32}
        required
        autoComplete="username"
        value={name}
        onChange={setName}
      />
      <TextField
        label="E-mail"
        tip="Only for a forgotten password; never shown"
        type="email"
        maxLength={EMAIL_MAX}
        required
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      <TextField
        label="Password"
        tip={PASSWORD_TIP}
        type="password"
        maxLength={PASSWORD_LIMIT}
        required
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <Submit
        busy={action.busy}
        tip="Create the account; a mail tells you how to go on"
        label="Create account"
      />
      {sent && <RegisterSent />}
      {action.error !== null && <p role="alert">{action.error}</p>}
    </form>
  );
}

// The same words for a new and a taken e-mail (D36); the account waits for the mail's link (D42).
function RegisterSent() {
  return (
    <p role="status">
      Thank you. A mail to this address tells you how to go on: a new account is made once you open
      the link in it. Then sign in with your name and password.
    </p>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const action = useAction();
  const body: ForgotRequest = { email: email.trim() };
  return (
    <form
      aria-label="Forgotten password"
      onSubmit={(event) => {
        event.preventDefault();
        action.run(async () => {
          await post('/auth/forgot', body);
          setSent(true);
        });
      }}
    >
      <TextField
        label="E-mail"
        tip="The e-mail of your account"
        type="email"
        maxLength={EMAIL_MAX}
        required
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      <Submit busy={action.busy} tip="Send a link to choose a new password" label="Send the link" />
      {sent && (
        <p role="status">
          If an account has this e-mail, a link is on its way. It works once, for one hour.
        </p>
      )}
      {action.error !== null && <p role="alert">{action.error}</p>}
    </form>
  );
}

export function AccountEntry({ onEnter }: { onEnter: (me: Me) => void }) {
  const [form, setForm] = useState<Form>('sign-in');
  const others = (Object.keys(TITLES) as Form[]).filter((f) => f !== form);
  return (
    <section className="sk-panel sign-in account-entry" aria-label={TITLES[form]}>
      <h2>{TITLES[form]}</h2>
      {form === 'sign-in' && <SignInForm onEnter={onEnter} />}
      {form === 'register' && <RegisterForm />}
      {form === 'forgot' && <ForgotForm />}
      <p className="account-switch">
        {others.map((f) => (
          <button
            key={f}
            type="button"
            className="link-button"
            title={TITLES[f]}
            onClick={() => {
              setForm(f);
            }}
          >
            {TITLES[f]}
          </button>
        ))}
      </p>
      <p className="account-switch">
        <Link to="/privacy" className="tap">
          Privacy
        </Link>
      </p>
    </section>
  );
}
