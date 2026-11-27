/**
 * @file   packages/application/src/eventLog.test.ts
 * @brief  Tests the JSON-lines store: append-only lines per show, read back whole, safe ids; and
 *         both stores' `redact`, which takes a deleted player's name out of the logs (D61).
 *
 * Responsibility: write into a fresh temporary folder and remove it afterwards (CLAUDE.md:
 *                 test data is removed by its test).
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ShowEvent } from '@sc/domain';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { jsonlStore, memoryStore } from './eventLog.js';
import type { EventStore } from './ports.js';
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

const claimed = (name: string, id: string, caseNumber: number): ShowEvent => ({
  type: 'claimed',
  at: '2026-11-21T20:00:00.000Z',
  player: { id, name },
  rank: 1,
  caseNumber,
});

describe.each([
  ['the memory store', () => memoryStore()],
  ['the JSON-lines store', () => jsonlStore(dir)],
] as const)('redact in %s', (_name, make: () => EventStore) => {
  it('replaces the name in the shows that have it, and says which', () => {
    const store = make();
    store.append('show-a', [opened('2026-11-21T20:00:00.000Z'), claimed('Ana Example', 'ana', 1)]);
    store.append('show-a', [claimed('Noah', 'noah', 2)]);
    store.append('show-b', [claimed('Noah', 'noah', 1)]);
    expect(store.redact('ana', 'deleted player ana')).toEqual(['show-a']);
    const text = JSON.stringify([...store.loadAll()]);
    expect(text).not.toContain('Ana Example');
    expect(text).toContain('deleted player ana');
    // Noah's claims, the order of the events and the other show are as they were.
    expect(text).toContain('Noah');
    expect(
      store
        .loadAll()
        .get('show-a')
        ?.map((e) => e.type),
    ).toEqual(['registrationOpened', 'claimed', 'claimed']);
    expect(store.redact('ana', 'deleted player ana')).toEqual([]);
  });
});

describe('the JSON-lines store after a redaction', () => {
  it('holds the name in no file any more, and still takes appended events', () => {
    const store = jsonlStore(dir);
    store.append('show-a', [claimed('Ana Example', 'ana', 1)]);
    store.redact('ana', 'deleted player ana');
    expect(readFileSync(join(dir, 'show-a.jsonl'), 'utf8')).not.toContain('Ana Example');
    store.append('show-a', [claimed('Noah', 'noah', 2)]);
    expect(jsonlStore(dir).loadAll().get('show-a')).toHaveLength(2);
  });
});

describe('seasonOf', () => {
  it('maps the months to the meteorological seasons', () => {
    expect(
      ['01', '03', '06', '09', '11', '12'].map((m) => seasonOf(`2026-${m}-15T12:00:00.000Z`)),
    ).toEqual(['winter', 'spring', 'summer', 'autumn', 'autumn', 'winter']);
  });
});
