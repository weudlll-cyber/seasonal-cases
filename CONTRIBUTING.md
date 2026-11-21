# Contributing

Everything in this repository is English: code, comments, commit messages and docs. The rules for
Claude Code are in [CLAUDE.md](CLAUDE.md); they apply to human contributors too.

## Setup

Node 22 or newer (see `.nvmrc`), pnpm 12.14.0 (`corepack enable`), and Docker for the pre-commit
secret scan.

```sh
pnpm install   # also installs the git hooks (lefthook)
pnpm verify    # format check, lint, typecheck, tests
```

## Run the show locally

```sh
pnpm dev   # server 127.0.0.1:3970, client 0.0.0.0:5470
```

- The server's development sign-in and admin API need `NODE_ENV=development` and `SC_DEV=1`, which
  `apps/server/dev.env` sets. Any other setting answers 404 on those routes.
- The prototype keeps its shows in memory and appends every event to `.local/data/<showId>.jsonl`
  (git-ignored); on start the server rebuilds every show from its lines.
- Browser tests: `pnpm e2e` starts its own server on 3980 and client on 5480 with data under
  `.local/e2e/`, cleaned at every start; a running `pnpm dev` is neither used nor touched.

## Branching

- `master` is protected: every change is a branch and a pull request with green required checks;
  no force push, no deletion.
- One topic, one branch, kept until the topic is done; then it is merged once and deleted.
- Push after every finished piece, so the work is never only on one machine.
- Never force-push and never rewrite published history.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat(stage): …`, `fix(seal): …`,
`docs: …`, `chore(ci): …`, `test(domain): …`. Code, header comments, docs, `docs/BACKLOG.md` and
`docs/OPEN.md` change in the same commit.

The pre-commit hook formats the staged files with Prettier and scans them with gitleaks (Docker).
Lint, typecheck and tests run in `pnpm verify` and CI.

## Claude Code permissions

[.claude/settings.json](.claude/settings.json) holds the permissions of this project's Claude Code
session. It changes only when a task names the change. `.claude/settings.local.json` is never
committed.
