/**
 * @file   tools/bundleCheck.test.ts
 * @brief  Tests that the bundle check finds a development tool's words in a built file, in a
 *         nested folder too, and finds nothing in a clean build.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { findings } from './bundleCheck.js';

let dir = '';
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function built(files: Record<string, string>): string {
  dir = mkdtempSync(join(tmpdir(), 'sc-bundle-test-'));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

describe('the bundle check', () => {
  it('names the file and the string of a development tool', () => {
    const out = built({
      'index.html': '<p>fine</p>',
      'assets/index.js': 'x("/dev/quick-test");label:"Quick Test"',
    });
    const found = findings(out);
    expect(found).toHaveLength(2);
    expect(found.join('\n')).toContain('index.js');
    expect(found.join('\n')).toContain('"Quick Test"');
  });

  it('finds nothing in a clean build', () => {
    expect(findings(built({ 'assets/index.js': 'sign in; register; delete my account' }))).toEqual(
      [],
    );
  });
});
