/**
 * @file   apps/web/src/screens/Admin.tsx
 * @brief  The development admin: N, W, prize labels, the Quick Test seed, and the organiser's
 *         steps per show (CONCEPT §9 prototype).
 *
 * Responsibility: Quick Test (a live show with bots in one click, the caller holding the
 *                 direction), create, and per show: open registration, fill with bots, close,
 *                 seal, start; the list of shows. Every button calls the dev admin API; the
 *                 server checks the role and the rules.
 * Depends on:     react, @sc/contracts, @sc/ui, ../lib/api.js, ../lib/router.js,
 *                 ../lib/useAction.js, ./SetupForm.js
 */
import type { Me, ShowSummary } from '@sc/contracts';
import { formatTime } from '@sc/ui';
import { useCallback, useEffect, useState } from 'react';

import { getJson, postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import { navigate } from '../lib/router.js';
import { useAction } from '../lib/useAction.js';
import { SetupForm, type Setup } from './SetupForm.js';

// The organiser's steps per show: path, label, tooltip.
const STEPS = [
  ['open', 'Open registration', 'Players may pick cases from now on'],
  ['bots', 'Fill with bots', 'A bot claims every case nobody claimed'],
  ['close', 'Close', 'Close registration: each case goes to its winning claimant'],
  ['seal', 'Seal', 'Draw the contents and publish the commitment'],
  ['start', 'Start show', 'Go live; you hold the direction'],
] as const;

type Act = (call: () => Promise<unknown>, then?: () => Promise<void> | void) => void;

function ShowList({ shows, busy, act }: { shows: ShowSummary[]; busy: boolean; act: Act }) {
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
              {STEPS.map(([path, label, tip]) => (
                <button
                  key={path}
                  type="button"
                  className="button"
                  title={tip}
                  disabled={busy}
                  onClick={() => {
                    act(() => postJson(apiPath(`/dev/shows/${s.id}/${path}`)));
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

export interface AdminProps {
  readonly me: Me | null;
  // Asks the server for the show to follow at once (fix A of SC-N2), before any navigation.
  readonly onShowChanged: () => Promise<void>;
}

export function Admin({ me, onShowChanged }: AdminProps) {
  const [shows, setShows] = useState<ShowSummary[]>([]);
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
  if (me === null || (me.role !== 'admin' && me.role !== 'moderator')) {
    return (
      <p className="page card">Sign in as a moderator or admin to use the development admin.</p>
    );
  }
  const quickTest = (setup: Setup) => {
    act(
      () => postJson(apiPath('/dev/quick-test'), setup),
      () => {
        navigate('/show');
      },
    );
  };
  const create = (setup: Omit<Setup, 'seed'>) => {
    act(() => postJson(apiPath('/dev/shows'), setup));
  };
  return (
    <main className="page admin">
      <h1>Development admin</h1>
      <SetupForm busy={action.busy} onQuickTest={quickTest} onCreate={create} />
      {action.error !== null && (
        <p className="admin-error" role="alert">
          {action.error}
        </p>
      )}
      <ShowList shows={shows} busy={action.busy} act={act} />
    </main>
  );
}
