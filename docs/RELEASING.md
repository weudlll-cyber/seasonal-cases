# Releasing

How a release goes from the branch to a server. Every step that merges or tags waits for the
owner's word (CLAUDE.md "Git").

## 1. Ready

- `pnpm verify` green, the journeys green in Chromium (`pnpm e2e --project=chromium`), CI green
  on the branch's last commit (`gh run list --branch <branch>`).
- [CHANGELOG.md](../CHANGELOG.md) names the release; every `package.json` carries its version
  (`1.0.0` on master since 2026-11-23, `1.1.0-rc.3` on `kit/v0.17-adoption`).
- [security-pass.md](security-pass.md) has no open confirmed finding.

## 2. Merge (with the owner's word)

```sh
gh pr create --base master --head <branch> --title "<release>" --body-file <notes>
gh pr merge <number> --merge          # no squash, no rebase: the history stays
gh run list --branch master           # the merge commit's CI, reported
```

## 3. Tag (with the owner's word)

An annotated tag on the merge commit. Its commit exists only after the merge, so it is
registered in [TAGS.md](TAGS.md) afterwards, through a small pull request of its own (branch
`docs/tag-<tag>`), merged once its checks are green:

```sh
git switch master
git pull --ff-only
git tag -a v1.0.0 -m "Seasonal Cases 1.0.0" <merge commit>
git push origin v1.0.0
git switch -c docs/tag-v1.0.0          # TAGS.md gets the tag's row; then a PR as in step 2
```

After green CI on master the merged branch is deleted on origin (`git push origin --delete
<branch>`, proven by `git ls-remote`) and locally; what should remain as evidence stays as the
tag.

## 4. Update a server

On the server, in the clone the installer runs from (docs/INSTALL.md):

```sh
sudo ./deploy/install.sh --check --ref v1.0.0    # what would change
sudo ./deploy/install.sh --update --ref v1.0.0   # back up, fetch, build, restart; migrations run on start
curl http://127.0.0.1:3970/healthz               # {"status":"ok",…,"version":"1.0.0",…}
```

In website mode the health path is `/games/cases/healthz`.

## Repository settings (the kit's, DECISIONS D59)

The settings the kit's handbook lists, as read back with GET calls on 2026-11-24, and what they
are to be. The session that read them could not write them (its permission layer refused every
`gh api` write), so the owner applies them; after that this table is read back again.

| Setting                         | Read back on 2026-11-24                                               | To be                                                                                             |
| ------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Merge methods                   | merge commit, squash and rebase all allowed                           | `allow_squash_merge: false`, `allow_rebase_merge: false` (merge commits only)                     |
| Delete the branch after a merge | `delete_branch_on_merge: false`                                       | `true`                                                                                            |
| Wiki and Projects               | both on                                                               | `has_wiki: false`, `has_projects: false`                                                          |
| Conversations on master         | `required_conversation_resolution: false` (checks, strict, admins ok) | `true`; the required checks `verify`, `security`, `docs`, `e2e`, strict and admins stay           |
| Release tags                    | no ruleset                                                            | a ruleset "Release tags": `target: tag`, `refs/tags/v*`, rules `update` and `deletion`, no bypass |
| Vulnerability alerts            | off (the GET answers 404)                                             | on                                                                                                |
| Automated security fixes        | `enabled: false`                                                      | on                                                                                                |
| Actions pinned to commit SHAs   | `sha_pinning_required: false` (every `uses:` is already a full SHA)   | `true`                                                                                            |

The commands, one at a time (each is an ordinary REST call; or the page under Settings named in
brackets):

```sh
gh api -X PATCH repos/weudlll-cyber/seasonal-cases -F allow_squash_merge=false -F allow_rebase_merge=false -F delete_branch_on_merge=true -F has_wiki=false -F has_projects=false   # [General]
gh api -X POST repos/weudlll-cyber/seasonal-cases/branches/master/protection/required_conversation_resolution   # [Branches, the rule for master]
gh api -X PUT repos/weudlll-cyber/seasonal-cases/vulnerability-alerts   # [Code security]
gh api -X PUT repos/weudlll-cyber/seasonal-cases/automated-security-fixes   # [Code security]
gh api -X PUT repos/weudlll-cyber/seasonal-cases/actions/permissions -F enabled=true -f allowed_actions=all -F sha_pinning_required=true   # [Actions, General]
gh api -X POST repos/weudlll-cyber/seasonal-cases/rulesets --input release-tags.json   # [Rules, Rulesets]
```

`release-tags.json`: `{"name":"Release tags","target":"tag","enforcement":"active","conditions":{"ref_name":{"include":["refs/tags/v*"],"exclude":[]}},"rules":[{"type":"update"},{"type":"deletion"}]}`.
