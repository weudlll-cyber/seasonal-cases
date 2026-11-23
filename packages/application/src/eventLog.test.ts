/**
 * @file   packages/application/src/eventLog.test.ts
 * @brief  Tests the JSON-lines store: append-only lines per show, read back whole, safe ids.
 *
 * Responsibility: write into a fresh temporary folder and remove it afterwards (CLAUDE.md:
 *                 test data is removed by its test).
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ShowEvent } from '@sc/domain';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { jsonlStore } from './eventLog.js';
import { seasonOf } from './season.js';

let dir = '';
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sc-log-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const opened = (at: string): ShowEvent => ({ type: 'registrationOpened', at, by: 'mod-1' });

describe('jsonlStore', () => {
  it('appends one line per event and reads every show back', () => {
    const store = jsonlStore(dir);
    store.append('show-a', [opened('2026-11-21T20:00:00.000Z')]);
    store.append('show-a', [opened('2026-11-21T20:00:01.000Z')]);
    store.append('show-b', [opened('2026-11-21T20:00:02.000Z')]);
    const lines = readFileSync(join(dir, 'show-a.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    const all = jsonlStore(dir).loadAll();
    expect([...all.keys()]).toEqual(['show-a', 'show-b']);
    expect(all.get('show-a')?.map((e) => e.at)).toEqual([
      '2026-11-21T20:00:00.000Z',
      '2026-11-21T20:00:01.000Z',
    ]);
  });

  it('refuses a show id that is not a plain file name', () => {
    expect(() => {
      jsonlStore(dir).append('../escape', [opened('2026-11-21T20:00:00.000Z')]);
    }).toThrow(/unsafe/);
  });
});

describe('seasonOf', () => {
  it('maps the months to the meteorological seasons', () => {
    expect(
      ['01', '03', '06', '09', '11', '12'].map((m) => seasonOf(`2026-${m}-15T12:00:00.000Z`)),
    ).toEqual(['winter', 'spring', 'summer', 'autumn', 'autumn', 'winter']);
  });
});
