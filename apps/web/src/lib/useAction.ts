/**
 * @file   apps/web/src/lib/useAction.ts
 * @brief  Runs a button's async action and keeps its refusal as text to show.
 *
 * Responsibility: one way for every button to call the server: `run(action)` returns nothing
 *                 (safe as a click handler), clears the last error, and stores the error's
 *                 sentence when the server refuses. An `Ack` with `ok: false` counts as refused.
 *                 `sentenceOf` is that sentence for any caught error.
 * Depends on:     @seasonal/kit, react, @sc/contracts (types)
 */
import { ApiError } from '@seasonal/kit';
import type { Ack, ApiRefusal } from '@sc/contracts';
import { useCallback, useState } from 'react';

/** What to show for a failed call: the server's sentence where it answered with one. */
export function sentenceOf(e: unknown): string {
  if (!(e instanceof ApiError)) return e instanceof Error ? e.message : String(e);
  if (e.status === 0) return 'the server did not answer';
  const said = (e.body as Partial<ApiRefusal> | null)?.error;
  return said ?? `the server answered ${String(e.status)}`;
}

export interface Action {
  readonly error: string | null;
  readonly busy: boolean;
  readonly run: (action: () => Promise<unknown>) => void;
}

const isRefusedAck = (value: unknown): value is Extract<Ack, { ok: false }> =>
  typeof value === 'object' && value !== null && (value as { ok?: unknown }).ok === false;

export function useAction(): Action {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback((action: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    action()
      .then((result) => {
        if (isRefusedAck(result)) setError(result.error);
      })
      .catch((e: unknown) => {
        setError(sentenceOf(e));
      })
      .finally(() => {
        setBusy(false);
      });
  }, []);
  return { error, busy, run };
}
