/**
 * @file   tools/kitVersionParse.ts
 * @brief  The kit-version watch's reading and counting: the pin, the tags, the releases between.
 *
 * Responsibility: pure functions for ./kitVersion.ts (DECISIONS D41). The pin is the tag after
 *                 `seasonal-kit#` in the root package.json's `@seasonal/kit`; the tags are the
 *                 `refs/tags/vX.Y.Z` lines of `git ls-remote --tags` (peeled `^{}` lines and
 *                 anything that is not plain semver are left out); the newest is the highest by
 *                 semver; "behind" counts the tags above the pin; the CHANGELOG headings are the
 *                 kit's `## [X.Y.Z] - date` lines of those releases. The report is one line,
 *                 then a heading per release, or a note why the headings are missing.
 * Depends on:     nothing
 */

export interface Version {
  readonly tag: string;
  readonly parts: readonly [number, number, number];
}

const SEMVER_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

/** The tag as a version, or null when it is not a plain `vX.Y.Z`. */
export function versionOf(tag: string): Version | null {
  const m = SEMVER_TAG.exec(tag);
  if (m === null) return null;
  return { tag, parts: [Number(m[1]), Number(m[2]), Number(m[3])] };
}

/** Negative when a is older than b, 0 when equal, positive when newer. */
export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i += 1) {
    const d = (a.parts[i] ?? 0) - (b.parts[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** The pinned tag of `@seasonal/kit` in a package.json's text, or null without a tag pin. */
export function pinnedTag(packageJson: string): string | null {
  const parsed = JSON.parse(packageJson) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const spec = parsed.dependencies?.['@seasonal/kit'] ?? parsed.devDependencies?.['@seasonal/kit'];
  const m = spec === undefined ? null : /seasonal-kit#(v[^#\s]+)$/.exec(spec);
  return m?.[1] ?? null;
}

/** The plain semver tags of `git ls-remote --tags` output, oldest first. */
export function tagsFrom(lsRemote: string): readonly Version[] {
  const found = new Map<string, Version>();
  for (const line of lsRemote.split(/\r?\n/)) {
    const ref = line.split('\t')[1]?.trim();
    if (ref?.startsWith('refs/tags/') !== true || ref.endsWith('^{}')) continue;
    const version = versionOf(ref.slice('refs/tags/'.length));
    if (version !== null) found.set(version.tag, version);
  }
  return [...found.values()].sort(compareVersions);
}

/** The releases after the pin, oldest first. */
export function releasesAfter(pinned: Version, tags: readonly Version[]): readonly Version[] {
  return tags.filter((t) => compareVersions(t, pinned) > 0);
}

/** The CHANGELOG heading of each release, in the order given; a release without one is left out. */
export function changelogHeadings(changelog: string, releases: readonly Version[]): string[] {
  const lines = changelog.split(/\r?\n/);
  return releases.flatMap((r) => {
    const plain = r.tag.slice(1);
    const heading = lines.find((l) => l.startsWith(`## [${plain}]`));
    return heading === undefined ? [] : [heading];
  });
}

export interface Report {
  readonly line: string;
  readonly behind: number;
  readonly details: readonly string[];
}

/** The watch's report: the one line, how many releases behind, and the lines under it. */
export function reportOf(pin: string, tags: readonly Version[], changelog: string | null): Report {
  const pinned = versionOf(pin);
  const newest = tags.at(-1);
  if (pinned === null || newest === undefined) {
    return {
      line: `kit: pinned ${pin}, newest unknown (no semver tags read)`,
      behind: 0,
      details: [],
    };
  }
  const after = releasesAfter(pinned, tags);
  if (after.length === 0) {
    return { line: `kit: pinned ${pin}, newest ${newest.tag}, current`, behind: 0, details: [] };
  }
  const word = after.length === 1 ? 'release' : 'releases';
  const line = `kit: pinned ${pin}, newest ${newest.tag}, ${String(after.length)} ${word} behind`;
  if (changelog === null) {
    return { line, behind: after.length, details: ['(headings skipped: no local kit clone)'] };
  }
  const headings = changelogHeadings(changelog, after);
  const missing = after.length - headings.length;
  const note =
    missing > 0 ? [`(${String(missing)} heading(s) not in the local clone's CHANGELOG)`] : [];
  return { line, behind: after.length, details: [...headings, ...note] };
}
