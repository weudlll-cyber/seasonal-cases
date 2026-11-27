/**
 * @file   tools/bundleCheck.ts
 * @brief  `pnpm bundle:check`: the production bundle has none of the development tools (D63).
 *
 * Responsibility: builds the client for production into a temporary folder and searches every
 *                 built file for the strings that identify a development tool: the development
 *                 sign-in (its route, its menu and its form), the Quick Test (its route, its seed
 *                 field and its button) and "Fill with bots". The tools sit behind Vite's
 *                 build-time `import.meta.env.DEV`, not a runtime check, so a production build
 *                 must not hold their words at all. Exits 1 with the file and the string for each
 *                 match; removes the folder either way.
 * Depends on:     node:child_process, node:fs, node:os, node:path, node:url, node:util
 */
import { execFile } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const WEB = fileURLToPath(new URL('../apps/web/', import.meta.url));

/** What only a development tool says. */
export const FORBIDDEN = [
  'dev/sign-in',
  'dev/quick-test',
  'Dev sign-in',
  'Development sign-in',
  'Sign in as organiser',
  'Quick Test',
  'Fill with bots',
  // The opening's showcase page (D63).
  'dev/opening',
  'Play the opening',
] as const;

/** Every file under a folder, as full paths. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

/** The `file: string` lines for every forbidden string found in the built files. */
export function findings(dir: string): string[] {
  return filesUnder(dir).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return FORBIDDEN.filter((s) => text.includes(s)).map(
      (s) => `${file.slice(dir.length)}: "${s}"`,
    );
  });
}

async function main(): Promise<void> {
  const out = mkdtempSync(join(tmpdir(), 'sc-bundle-'));
  try {
    const run = promisify(execFile);
    await run('pnpm', ['exec', 'vite', 'build', '--outDir', out, '--emptyOutDir'], {
      cwd: WEB,
      shell: process.platform === 'win32',
    });
    const found = findings(out);
    if (found.length > 0) {
      process.stderr.write(`development tools in the production bundle:\n${found.join('\n')}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`bundle: none of ${String(FORBIDDEN.length)} development strings\n`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
