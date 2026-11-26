/**
 * @file   apps/web/src/screens/SignIn.tsx
 * @brief  The development sign-in: a name, a role and a rank, no password (CONCEPT §10).
 *
 * Responsibility: the prototype's only way in, so the owner can play as a player in one tab
 *                 and hold the direction in another. The server refuses it outside development.
 *                 Loaded on demand by ./StartPage.tsx in a development build only (D63).
 * Depends on:     react, @sc/contracts, ../lib/devSignIn.js (types), ../lib/useAction.js,
 *                 ./fields.js
 */
import { RANK_MAX, ROLES, type Rank, type Role } from '@sc/contracts';
import { useState } from 'react';

import type { DevSignInFn } from '../lib/devSignIn.js';
import { useAction } from '../lib/useAction.js';
import { ChoiceField, TextField } from './fields.js';

const ROLE_CHOICES = ROLES.map((r) => ({ value: r, text: r }));
const RANK_CHOICES = Array.from({ length: RANK_MAX + 1 }, (_, r) => ({
  value: r,
  text: r === 0 ? '0 (unassigned)' : String(r),
}));

export function SignIn({ onSignIn }: { onSignIn: DevSignInFn }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('player');
  const [rank, setRank] = useState<Rank>(0);
  const action = useAction();
  return (
    <form
      className="sk-panel sign-in"
      aria-label="Development sign-in"
      onSubmit={(event) => {
        event.preventDefault();
        action.run(() => onSignIn({ name: name.trim(), role, rank }));
      }}
    >
      <h2>Development sign-in</h2>
      <TextField
        label="Name"
        tip="Any name; it is shown on the stage"
        maxLength={32}
        required
        value={name}
        onChange={setName}
      />
      <ChoiceField
        label="Role"
        tip="Player: picks a case. Organiser: leads the show. Admin: also the dev admin."
        value={role}
        choices={ROLE_CHOICES}
        onChange={setRole}
      />
      <ChoiceField
        label="Rank"
        tip="The Seasonal rank decides case conflicts: higher wins, then the earlier pick"
        value={rank}
        choices={RANK_CHOICES}
        onChange={setRank}
      />
      <button
        type="submit"
        className="sk-btn sk-btn--primary"
        disabled={action.busy}
        title="Sign in"
      >
        Sign in
      </button>
      {action.error !== null && <p role="alert">{action.error}</p>}
    </form>
  );
}
