/**
 * @file   apps/web/src/screens/QuickTestParts.tsx
 * @brief  The admin area's Quick Test: the seed field and the button, development builds only
 *         (D63; CONCEPT §9).
 *
 * Responsibility: a live show with bots in one click, from a seed (the same seed gives the same
 *                 bots and the same sealing): the seed field, the "Quick Test" button, and the
 *                 call to the server's development route. Loaded on demand by ./Admin.tsx only
 *                 when Vite's DEV flag is set, so a production bundle contains neither the
 *                 button, nor its words, nor the route's path. The server refuses the route
 *                 outside development as well.
 * Depends on:     react, ../lib/api.js, ../lib/base.js, ../lib/router.js, ./SetupForm.js (types),
 *                 ./fields.js
 */
import { useState } from 'react';

import { postJson } from '../lib/api.js';
import { apiPath } from '../lib/base.js';
import { navigate } from '../lib/router.js';
import { TextField } from './fields.js';
import type { Setup } from './SetupForm.js';

/** The admin's way to run a call: busy state, refresh, then what follows. */
export type Act = (call: () => Promise<unknown>, then?: () => Promise<void> | void) => void;

export interface QuickTestProps {
  readonly busy: boolean;
  readonly setup: Setup;
  readonly act: Act;
}

export function QuickTestControls({ busy, setup, act }: QuickTestProps) {
  const [seed, setSeed] = useState('sc-n1-01');
  return (
    <>
      <TextField
        label="Quick Test seed"
        tip="The same seed gives the same bots and the same sealing"
        maxLength={64}
        required
        value={seed}
        onChange={setSeed}
      />
      <span className="admin-buttons">
        <button
          type="button"
          className="button button-solid"
          disabled={busy}
          title="Create, fill with bots, seal and start a show from the seed; you hold the direction"
          onClick={() => {
            act(
              () => postJson(apiPath('/dev/quick-test'), { ...setup, seed }),
              () => {
                navigate('/show');
              },
            );
          }}
        >
          Quick Test
        </button>
      </span>
    </>
  );
}
