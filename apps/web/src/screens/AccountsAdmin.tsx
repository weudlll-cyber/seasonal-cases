/**
 * @file   apps/web/src/screens/AccountsAdmin.tsx
 * @brief  The admin's accounts: each account's role and rank (CONCEPT §4, DECISIONS D24).
 *
 * Responsibility: list the accounts and change a role or a rank in place; a standalone admin
 *                 sets up two-factor sign-in first (../account/TwoFactorSetup.tsx), and once it is
 *                 set up can make new recovery codes (../account/RecoveryReissue.tsx). Website accounts take
 *                 both from the website and show them read-only; the server refuses changes to
 *                 them and to the admin's own admin role, and ends a changed role's sessions.
 * Depends on:     react, @sc/contracts, ../account/RecoveryReissue.js,
 *                 ../account/TwoFactorSetup.js, ../lib/*, ./SettingsAdmin.js
 */
import {
  ACCOUNT_ROLES,
  RANK_MAX,
  type AccountRow,
  type AccountUpdate,
  type Me,
  type TwoFactorStatus,
} from '@sc/contracts';
import { useCallback, useEffect, useState } from 'react';

import { api, post } from '../lib/base.js';
import { useAction } from '../lib/useAction.js';
import { RecoveryReissue } from '../account/RecoveryReissue.js';
import { TwoFactorSetup } from '../account/TwoFactorSetup.js';
import { SettingsAdmin } from './SettingsAdmin.js';

const RANKS = Array.from({ length: RANK_MAX + 1 }, (_, r) => r);

interface ItemProps {
  readonly account: AccountRow;
  readonly self: boolean;
  readonly busy: boolean;
  readonly change: (id: string, update: AccountUpdate) => void;
}

// One account: its role and rank as choices, read-only for website accounts.
function AccountItem({ account: a, self, busy, change }: ItemProps) {
  const fixed = a.kind === 'website' || busy;
  return (
    <li data-account={a.name}>
      <span>{a.name}</span>
      <span>{a.kind}</span>
      <select
        className="sk-select"
        aria-label={`Role of ${a.name}`}
        title="Player picks cases; organiser leads shows; admin also manages accounts"
        value={a.role}
        disabled={fixed || self}
        onChange={(e) => {
          change(a.id, { role: e.target.value as AccountRow['role'] });
        }}
      >
        {ACCOUNT_ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        className="sk-select"
        aria-label={`Rank of ${a.name}`}
        title="The rank decides case conflicts: higher wins"
        value={a.rank}
        disabled={fixed}
        onChange={(e) => {
          change(a.id, { rank: Number(e.target.value) });
        }}
      >
        {RANKS.map((r) => (
          <option key={r} value={r}>
            {r === 0 ? '0 (unassigned)' : r}
          </option>
        ))}
      </select>
    </li>
  );
}

// Website mode has no two-factor routes: the website signs its admins in.
const NOT_ASKED: TwoFactorStatus = { required: false, enabled: false };

/** The settings and the accounts, after two-factor sign-in is set up where it is required. */
export function AdminAccounts({ me }: { me: Me }) {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const load = useCallback(() => {
    api<TwoFactorStatus>('/me/2fa')
      .then(setStatus)
      .catch(() => {
        setStatus(NOT_ASKED);
      });
  }, []);
  useEffect(load, [load]);
  if (status === null) return null;
  if (status.required && !status.enabled) return <TwoFactorSetup onEnabled={load} />;
  return (
    <>
      <SettingsAdmin />
      <AccountsAdmin me={me} />
      {status.enabled && <RecoveryReissue />}
    </>
  );
}

function AccountsAdmin({ me }: { me: Me }) {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const action = useAction();
  const refresh = useCallback(() => {
    api<AccountRow[]>('/admin/accounts')
      .then(setRows)
      .catch(() => undefined);
  }, []);
  useEffect(refresh, [refresh]);
  const change = (id: string, update: AccountUpdate) => {
    action.run(async () => {
      await post(`/admin/accounts/${id}`, update);
      refresh();
    });
  };
  return (
    <section className="sk-panel" aria-label="Accounts">
      <h2>Accounts</h2>
      {action.error !== null && <p role="alert">{action.error}</p>}
      <ul className="admin-accounts">
        {rows.map((a) => (
          <AccountItem
            key={a.id}
            account={a}
            self={a.id === me.id}
            busy={action.busy}
            change={change}
          />
        ))}
      </ul>
    </section>
  );
}
