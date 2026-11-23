# Releasing

How a release goes from the branch to a server. Every step that merges or tags waits for the
owner's word (CLAUDE.md "Git").

## 1. Ready

- `pnpm verify` green, the journeys green in Chromium (`pnpm e2e --project=chromium`), CI green
  on the branch's last commit (`gh run list --branch <branch>`).
- [CHANGELOG.md](../CHANGELOG.md) names the release; every `package.json` carries its version
  (`1.0.0-rc.3` now, then `1.0.0`).
- [security-pass.md](security-pass.md) has no open confirmed finding.

## 2. Merge (with the owner's word)

```sh
gh pr create --base master --head <branch> --title "<release>" --body-file <notes>
gh pr merge <number> --merge          # no squash, no rebase: the history stays
gh run list --branch master           # the merge commit's CI, reported
```

## 3. Tag (with the owner's word)

An annotated tag on the merge commit, registered in [TAGS.md](TAGS.md) in the same change:

```sh
git switch master
git pull --ff-only
git tag -a v1.0.0 -m "Seasonal Cases 1.0.0" <merge commit>
git push origin v1.0.0
```

After green CI on master the merged branch is deleted on origin (`git push origin --delete
<branch>`, proven by `git ls-remote`) and locally; what should remain as evidence stays as the
tag.

## 4. Update a server

On the server, in the clone the installer runs from (docs/INSTALL.md):

```sh
sudo ./deploy/install.sh --check --ref v1.0.0    # what would change
sudo ./deploy/install.sh --update --ref v1.0.0   # fetch, build, restart; migrations run on start
curl http://127.0.0.1:3970/api/health            # {"ok":true,…,"version":"1.0.0",…}
```

In website mode the health path is `/games/cases/api/health`.
