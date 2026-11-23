/**
 * @file   tools/kitVersion.ts
 * @brief  `pnpm kit:check`: the pinned kit tag against the kit's newest tag, one line.
 *
 * Responsibility: the kit-version watch (DECISIONS D41). Reads the pin from the root
 *                 package.json, lists the kit's tags with `git ls-remote --tags` (15 s at most),
 *                 and prints `kit: pinned vA, newest vB, current` or `…, N releases behind` with
 *                 the CHANGELOG heading of each release in between, read from the local kit clone
 *                 (`SC_KIT_CLONE`, default ../seasonal-kit beside this repository) when it is
 *                 there. With `--ci` it also writes the line to the job summary
 *                 (GITHUB_STEP_SUMMARY) and, when behind, a `::warning::` annotation. It never
 *                 fails: without the network it says so, and it always exits 0. Moving the pin
 *                 stays the owner's word (CLAUDE.md "The kit").
 * Depends on:     node:child_process, node:fs, node:path, node:url, node:util,
 *                 ./kitVersionParse.js
 */
import { execFile } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { pinnedTag, reportOf, tagsFrom, type Report } from './kitVersionParse.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const KIT_REMOTE = 'https://github.com/weudlll-cyber/seasonal-kit';
const TIMEOUT_MS = 15_000;

async function lsRemote(): Promise<string> {
  const run = promisify(execFile);
  const { stdout } = await run('git', ['ls-remote', '--tags', KIT_REMOTE], {
    timeout: TIMEOUT_MS,
    windowsHide: true,
  });
  return stdout;
}

// The local clone's CHANGELOG, or null when there is no clone.
function localChangelog(): string | null {
  const clone = process.env['SC_KIT_CLONE'] ?? join(ROOT, '..', 'seasonal-kit');
  const file = join(clone, 'CHANGELOG.md');
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

// In CI: the line in the job summary, and a warning annotation when the pin is behind.
function toCi(report: Report): void {
  const summary = process.env['GITHUB_STEP_SUMMARY'];
  if (summary !== undefined && summary !== '') {
    const body = [report.line, ...report.details].map((l) => `    ${l}`).join('\n');
    appendFileSync(summary, `### Kit version\n\n${body}\n`);
  }
  if (report.behind > 0) console.log(`::warning title=Kit version::${report.line}`);
}

async function main(): Promise<void> {
  const ci = process.argv.includes('--ci');
  const pin = pinnedTag(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  if (pin === null) {
    console.log('kit: no tag pin of @seasonal/kit in package.json');
    return;
  }
  let listed: string;
  try {
    listed = await lsRemote();
  } catch {
    console.log(
      `kit: pinned ${pin}, newest unknown (the kit's tags could not be read: no network?)`,
    );
    return;
  }
  const report = reportOf(pin, tagsFrom(listed), localChangelog());
  console.log(report.line);
  for (const detail of report.details) console.log(`  ${detail}`);
  if (ci) toCi(report);
}

// Never a failure: whatever goes wrong is said, and the exit code stays 0.
main().catch((error: unknown) => {
  console.log(`kit: the check could not run (${String(error)})`);
});
