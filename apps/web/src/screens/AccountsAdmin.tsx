/**
 * @file   apps/web/src/screens/AccountsAdmin.tsx
 * @brief  The admin's accounts: each account's role and rank (CONCEPT §4, DECISIONS D24).
 *
 * Responsibility: list the accounts and change a role or a rank in place. Website accounts take
 *                 both from the website and show them read-only; the server refuses changes to
 *                 them and to the admin's own admin role, and ends a changed role's sessions.
 * Depends on:     react, @sc/contracts, ../lib/*, ./fields.js
 */
import {
  ACCOUNT_ROLES,
  RANK_MAX,
  type AccountRow,
  type AccountUpdate,
  type Me,
} from '@sc/contracts';
import { useCallback, useEffect, useState } from 'react';

import { getJson, postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import { useAction } from '../lib/useAction.js';

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

export function AccountsAdmin({ me }: { me: Me }) {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const action = useAction();
  const refresh = useCallback(() => {
    getJson<AccountRow[]>(apiPath('/admin/accounts'))
      .then(setRows)
      .catch(() => undefined);
  }, []);
  useEffect(refresh, [refresh]);
  const change = (id: string, update: AccountUpdate) => {
    action.run(async () => {
      await postJson(apiPath(`/admin/accounts/${id}`), update);
      refresh();
    });
  };
  return (
    <section className="card" aria-label="Accounts">
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
