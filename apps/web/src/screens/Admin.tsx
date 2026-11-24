/**
 * @file   apps/web/src/screens/Admin.tsx
 * @brief  The admin area: N, W, prize labels, the organiser's steps per show (CONCEPT §9), and
 *         for an admin the accounts' roles and ranks (D24).
 *
 * Responsibility: create, and per show: open registration, close, seal, start; the list of shows,
 *                 the setup starting from the settings' defaults; the settings and the accounts
 *                 (./AccountsAdmin.tsx). Every button calls the server, which checks the role and
 *                 the rules. The Quick Test (a live show with bots in one click, the caller
 *                 holding the direction) and "Fill with bots" exist in a development build only
 *                 (D34, D63): their parts are loaded on demand under Vite's DEV flag, so a
 *                 production bundle has neither their words nor their paths.
 * Depends on:     react, @sc/contracts, @sc/ui, ../lib/api.js, ../lib/router.js,
 *                 ../lib/useAction.js, ../shell/DevBoundary.js, ./AccountsAdmin.js,
 *                 ./QuickTestParts.js (lazy, development only), ./SetupForm.js
 */
import { canDirect, type Me, type Settings, type ShowSummary } from '@sc/contracts';
import { formatTime } from '@sc/ui';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import { getJson, postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import { useAction } from '../lib/useAction.js';
import { DevBoundary } from '../shell/DevBoundary.js';
import { AdminAccounts } from './AccountsAdmin.js';
import type { Act } from './QuickTestParts.js';
import { SetupForm, type Setup } from './SetupForm.js';

// The organiser's steps per show: path, label, tooltip.
const STEPS: readonly (readonly [string, string, string])[] = [
  ['open', 'Open registration', 'Players may pick cases from now on'],
  ['close', 'Close', 'Close registration: each case goes to its winning claimant'],
  ['seal', 'Seal', 'Draw the contents and publish the commitment'],
  ['start', 'Start show', 'Go live; you hold the direction'],
];

// "Fill with bots" follows "Open registration", in a development build only (DECISIONS D34, D63):
// the server refuses it anywhere else, and a production bundle does not contain it.
const BOTS: readonly (readonly [string, string, string])[] = import.meta.env.DEV
  ? [['bots', 'Fill with bots', 'A bot claims every case nobody claimed']]
  : [];

// The Quick Test's parts, loaded on demand in a development build only.
const QuickTest = import.meta.env.DEV
  ? lazy(() => import('./QuickTestParts.js').then((m) => ({ default: m.QuickTestControls })))
  : null;

interface ShowListProps {
  readonly shows: ShowSummary[];
  readonly busy: boolean;
  readonly act: Act;
  readonly dev: boolean;
}

function ShowList({ shows, busy, act, dev }: ShowListProps) {
  const steps = dev ? [...STEPS.slice(0, 1), ...BOTS, ...STEPS.slice(1)] : STEPS;
  return (
    <section className="card" aria-label="Shows">
      <h2>Shows</h2>
      {shows.length === 0 && <p>No show yet.</p>}
      <ul className="admin-shows">
        {shows.map((s) => (
          <li key={s.id} data-show={s.id}>
            <span className="admin-show-id">{s.id}</span>
            <span>
              {s.state} · {s.caseCount} cases · {s.winnerCount} winners · {formatTime(s.createdAt)}
            </span>
            <span className="admin-steps">
              {steps.map(([path, label, tip]) => (
                <button
                  key={path}
                  type="button"
                  className="button"
                  title={tip}
                  disabled={busy}
                  onClick={() => {
                    act(() => postJson(apiPath(`/shows/${s.id}/${path}`)));
                  }}
                >
                  {label}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Defaults = { cases: number; winners: number } | null;

/**
 * The settings' default N and W for an organiser or admin: undefined while asked, null when not
 * to be had (the form then starts from the catalogue's).
 */
function useDefaults(me: Me | null): Defaults | undefined {
  const [defaults, setDefaults] = useState<Defaults>();
  const may = me !== null && canDirect(me.role);
  useEffect(() => {
    if (!may) return;
    getJson<Settings>(apiPath('/settings'))
      .then((s) => {
        setDefaults({ cases: s.defaultCases, winners: s.defaultWinners });
      })
      .catch(() => {
        setDefaults(null);
      });
  }, [may]);
  return may ? defaults : null;
}

export interface AdminProps {
  readonly me: Me | null;
  // Asks the server for the show to follow at once (fix A of SC-N2), before any navigation.
  readonly onShowChanged: () => Promise<void>;
  // The Quick Test exists only in development.
  readonly dev: boolean;
}

export function Admin({ me, onShowChanged, dev }: AdminProps) {
  const [shows, setShows] = useState<ShowSummary[]>([]);
  const defaults = useDefaults(me);
  const action = useAction();
  const refresh = useCallback(() => {
    getJson<ShowSummary[]>(apiPath('/shows'))
      .then(setShows)
      .catch(() => undefined);
  }, []);
  useEffect(refresh, [refresh]);
  const act: Act = (call, then) => {
    action.run(async () => {
      await call();
      refresh();
      await onShowChanged();
      await then?.();
    });
  };
  if (me === null || (me.role !== 'admin' && me.role !== 'organiser')) {
    return <p className="page card">Sign in as an organiser or admin to use the admin area.</p>;
  }
  const quick =
    dev && QuickTest !== null
      ? (setup: Setup) => (
          <DevBoundary>
            <Suspense fallback={null}>
              <QuickTest busy={action.busy} setup={setup} act={act} />
            </Suspense>
          </DevBoundary>
        )
      : undefined;
  const create = (setup: Setup) => {
    act(() => postJson(apiPath('/shows'), setup));
  };
  return (
    <main className="page admin">
      <h1>Admin</h1>
      {/* The form waits for the defaults: arriving later, they would replace what was typed. */}
      {defaults === undefined ? (
        <p className="card">Loading the settings…</p>
      ) : (
        <SetupForm
          {...(defaults === null ? {} : { defaults })}
          busy={action.busy}
          {...(quick === undefined ? {} : { quick })}
          onCreate={create}
        />
      )}
      {action.error !== null && (
        <p className="admin-error" role="alert">
          {action.error}
        </p>
      )}
      <ShowList shows={shows} busy={action.busy} act={act} dev={dev} />
      {me.role === 'admin' && <AdminAccounts me={me} />}
    </main>
  );
}
