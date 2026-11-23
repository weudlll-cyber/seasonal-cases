/**
 * @file   tools/kitVersionParse.test.ts
 * @brief  Tests the kit-version watch's reading: the pin, the tag list, the semver order, the
 *         count behind and the report's lines.
 */
import { describe, expect, it } from 'vitest';

import {
  changelogHeadings,
  pinnedTag,
  releasesAfter,
  reportOf,
  tagsFrom,
  versionOf,
} from './kitVersionParse.js';

const LS_REMOTE = [
  'a1\trefs/tags/v0.10.0',
  'a2\trefs/tags/v0.10.0^{}',
  'b1\trefs/tags/v0.2.0',
  'c1\trefs/tags/v0.11.0',
  'd1\trefs/tags/v0.9.1',
  'e1\trefs/tags/v1.0.0-rc.1',
  'f1\trefs/tags/not-a-version',
  'g1\trefs/heads/master',
  '',
].join('\n');

const CHANGELOG = [
  '# Changelog',
  '## [Unreleased]',
  '## [0.11.0] - 2026-11-23',
  'text',
  '## [0.10.0] - 2026-11-22',
  '## [0.9.1] - 2026-11-22',
].join('\n');

const tag = (t: string) => {
  const v = versionOf(t);
  if (v === null) throw new Error(t);
  return v;
};

describe('the pin', () => {
  it('is the tag after seasonal-kit# in the dependencies or devDependencies', () => {
    const dev = {
      devDependencies: { '@seasonal/kit': 'github:weudlll-cyber/seasonal-kit#v0.11.0' },
    };
    expect(pinnedTag(JSON.stringify(dev))).toBe('v0.11.0');
    const dep = { dependencies: { '@seasonal/kit': 'github:weudlll-cyber/seasonal-kit#v0.8.0' } };
    expect(pinnedTag(JSON.stringify(dep))).toBe('v0.8.0');
  });

  it('is null without the kit or without a tag', () => {
    expect(pinnedTag('{}')).toBeNull();
    const branch = { dependencies: { '@seasonal/kit': 'github:weudlll-cyber/seasonal-kit' } };
    expect(pinnedTag(JSON.stringify(branch))).toBeNull();
  });
});

describe('the tags', () => {
  it('are the plain semver tags, once each, oldest first by semver, not by text', () => {
    expect(tagsFrom(LS_REMOTE).map((v) => v.tag)).toEqual([
      'v0.2.0',
      'v0.9.1',
      'v0.10.0',
      'v0.11.0',
    ]);
  });

  it('after the pin are the newer ones only', () => {
    const tags = tagsFrom(LS_REMOTE);
    expect(releasesAfter(tag('v0.9.1'), tags).map((v) => v.tag)).toEqual(['v0.10.0', 'v0.11.0']);
    expect(releasesAfter(tag('v0.11.0'), tags)).toEqual([]);
  });

  it('give each release its CHANGELOG heading', () => {
    expect(changelogHeadings(CHANGELOG, [tag('v0.10.0'), tag('v0.11.0')])).toEqual([
      '## [0.10.0] - 2026-11-22',
      '## [0.11.0] - 2026-11-23',
    ]);
  });
});

describe('the report', () => {
  const tags = tagsFrom(LS_REMOTE);

  it('says current when the pin is the newest', () => {
    expect(reportOf('v0.11.0', tags, CHANGELOG)).toEqual({
      line: 'kit: pinned v0.11.0, newest v0.11.0, current',
      behind: 0,
      details: [],
    });
  });

  it('counts the releases behind and lists their headings', () => {
    const report = reportOf('v0.9.1', tags, CHANGELOG);
    expect(report.line).toBe('kit: pinned v0.9.1, newest v0.11.0, 2 releases behind');
    expect(report.behind).toBe(2);
    expect(report.details).toEqual(['## [0.10.0] - 2026-11-22', '## [0.11.0] - 2026-11-23']);
    expect(reportOf('v0.10.0', tags, CHANGELOG).line).toContain('1 release behind');
  });

  it('notes skipped or missing headings', () => {
    expect(reportOf('v0.9.1', tags, null).details).toEqual([
      '(headings skipped: no local kit clone)',
    ]);
    const without = CHANGELOG.replace('## [0.9.1] - 2026-11-22', '');
    expect(reportOf('v0.2.0', tags, without).details.at(-1)).toBe(
      "(1 heading(s) not in the local clone's CHANGELOG)",
    );
  });

  it('says newest unknown without semver tags or with an odd pin', () => {
    expect(reportOf('v0.11.0', [], CHANGELOG).line).toBe(
      'kit: pinned v0.11.0, newest unknown (no semver tags read)',
    );
    expect(reportOf('main', tags, CHANGELOG).behind).toBe(0);
  });
});
