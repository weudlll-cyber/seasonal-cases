# CLAUDE.md — Working rules for this repository (Seasonal Cases)

## Language

Everything in this repository is English: code, comments, commit messages, docs, UI strings.
The owner is addressed in German by the planning chat, never by files in this repository.

## Source of truth

- `docs/CONCEPT.md` governs what the show is and does. Read the sections a task names before
  changing code, and cite them in the report. It is the single valid concept: every revision
  replaces it whole and adds a row to its version table.
- If the concept is silent or contradictory on a point you need, do not invent a rule: implement
  the rest and list the question under "needs the owner's word" in the report and in
  `docs/HANDOVER.md`.
- Decisions are facts with a date in `docs/DECISIONS.md`. Never quote or paraphrase the owner;
  write the decision itself. Do not reverse one without a task that says so. Proposals by Claude
  Code or the planning chat are not rules until the owner confirms them.
- Settings and their defaults live in one catalogue (`packages/contracts`, once it exists), each
  with a description, min/max where technically needed and a warning on delicate values. Do not
  change a default unless the task says so.

## The kit

- `@seasonal/kit` is pinned to one tag in `package.json`. Before using it read its `README.md`,
  `CHANGELOG.md` (migration notes per game), `docs/DECISIONS.md`, `docs/DELIVERY.md` and, when it
  exists, `docs/ADOPTION.md` in `C:\Users\weudl\seasonal-kit`.
- Nothing the kit has is rebuilt here. A piece the kit lacks is built as small as possible under
  `packages/ui/src/pending/` with a header line naming the kit backlog item it waits for, and
  listed in `docs/BACKLOG.md` as an adoption item.
- The kit version changes only on the owner's word.

## Architecture rules

- Layers: `domain` ← `application` ← `apps/server`. `domain` has no I/O, no clock, no randomness
  except injected ports. `contracts` holds every shape shared across the wire.
- The server decides, the client renders. The client never learns a case's content before the
  moderator's "Open" step for that case. `Math.random` is forbidden outside tests.
- File ≤ 300 lines (tests ≤ 400), function ≤ 60 lines, complexity ≤ 12, no default exports, no
  `any`, no non-null `!`. Split by responsibility, not by line count.
- Every source file starts with a header comment: what it is, what it is for, what it depends on.
  Important blocks get inline comments.

## Hygiene in every task

- Before writing a helper, search for an existing one in this repository and in the kit; name
  reused helpers in the report.
- No dead code, no unused variables or exports in the area you touched; things noticed elsewhere
  are reported, not changed. Provably wrong comments and doc sentences in the area you touched are
  fixed in the same commit, without asking.
- Update header comments, inline comments, docs and line references in the same commit as the code.
- `docs/BACKLOG.md` is the authoritative list: part one open, part two closed with what closed it.
  A piece that closes an item moves it in the same commit, then aligns `docs/OPEN.md`. Checks that
  were run are recorded there too, so nothing is done twice.
- `docs/HANDOVER.md` is the state for a new planning chat: what the project is, where things
  stand, what runs, what is open, what needs the owner's word. Update it at the end of every piece.
- At the end of every chain, refresh HANDOVER's "Kit" line with the output of `pnpm kit:check`.
- New dependencies: name each one and the reason in the report. Exact versions only.
- The neighbour repositories (kit, Mini Games, Bingo Royale, website, Seasonal Party) are read-only
  from here. Something there that looks wrong is reported, not changed.
- Test data (accounts, shows) created by a test is removed by that test.
- Screenshots never enter the repository: they go under the git-ignored `.local/screens/<topic>/`;
  every run first deletes the previous state of its topic. The planning chat looks at them there.

## Git

- Work on the branch the task names. Push after every finished piece, merged or not.
- Merge only when the task explicitly allows it. After a merge, check CI for the merge commit
  (`gh run list --branch master`) and report it.
- One problem, one branch, until it is solved, then one merge. Follow-ups to a topic go on its
  branch.
- Never force-push, rebase, amend or reset. After a merge with green CI on master, delete the
  branch on origin (`git ls-remote` proves it) and locally; what should remain as evidence becomes
  an annotated tag, registered in `docs/TAGS.md`.
- Never disable a trigger, constraint or protection. If a task needs that, list it under the
  owner's questions and continue without it.
- Run commands one at a time. Do not chain them with `&&`, `;` or `|` unless a single tool needs a
  pipe; chained commands do not match the permission rules and make the owner approve them by hand.
- Servers run hidden in the background, never in a window the owner has to keep open.

## Tests and checks

- Tests prove something; none is written for a number. Targets: game logic 85 % branches.
- No flaky tests: one that is sometimes red is fixed at its cause the first time it flakes, not
  re-run.
- Only run checks that can answer something about the change: docs-only changes get the format
  check only; an identical tree is not measured again; no soak or hours-long comparison runs.
- Browser tests: Chromium at merge and on master; Firefox and WebKit nightly.
- Before the owner tests: play the show through yourself, on a server of its own (start, every
  step, end; light and dark; PC and phone sizes from `docs/CONCEPT.md` §7), look at every picture,
  fix known defects first.
  In a big move the sweep is that look for what it covers ("How we check", 3).

## How we check

The working rule of the kit HANDBOOK "How we check" (K82, K110). "Done" for a piece means built,
pushed and quick-checked.

A small task: before each push, the fast tests of the changed files
(`pnpm exec vitest run <files> --reporter=dot`) and, when the change touches what a browser spec
checks, that one spec in one browser. The full checks run on GitHub through the draft PR; look at
CI once at the end and before every merge, not between pieces.

A big move (a kit adoption, a migration, many known changes):

1. Build all changes first; between them only the typecheck, the lint of the touched files and the
   unit tests of the touched package. Then one round of the real checks, each once: the browser
   specs that cover the changes, the sweep, a rehearsal where ops changed, the draft PR's CI. A
   fault is fixed and only what the fix can have changed is checked again.
2. The sweep runs once, at the end. What it finds is fixed together and only that is checked
   again (a colour: the contrast of the screens concerned; a shared part's size or spacing: the
   screens that show it; anything else: the one screen). No further full run.
3. No walks or measurements between the pieces; a walk of its own only for what the sweep cannot
   check, named with its reason.
4. The report says how many full runs there were and why. An exemption names its reason: a kit
   part (`file:line` in the kit) or an owner decision (its number). Anything else is fixed.
5. Line counts come once, at the hand-over, for the whole branch against `master`.
6. One written report (the night sheet). The final message gives only the pushed commits, the CI
   result, the open questions with a proposal, new kit findings and the report's path.
7. A rehearsal covers only what the change can have altered: first list what changed in those
   paths (the CHANGELOG and the diff, `file:line`), then rehearse those.

The sweep: a server's request limit is met with the screen's `setup` (a fresh sign-in), never by
loosening the limit; an owner decision on a least number of visible items is declared in the
screen's `floors`.

## Where a check may look and write

The four rules of the kit HANDBOOK of that name (K125):

- A change that matters only on a server (a database health check over TCP, say) is made with the
  way to the server and rehearsed there with a fresh install, not as a change of its own before
  it. Until then it is a row in `docs/BACKLOG.md` part one.
- Browser tests, sweeps and measurements never write the owner's development database: they use
  their own database or schema, created fresh and thrown away. Here the browser tests' servers set
  `DATABASE_URL` empty and keep everything in memory and `.local/e2e/`; the store tests work in a
  schema of their own and drop it; a walk or a measurement of its own starts its own server.
- Browser journeys use fixed seeds and handle every outcome chance can give. A test that fails on
  a lucky outcome is a test defect, not a flaky run to repeat.
- A website-mode part is looked at in the local preview before a merge (README "The local
  website-mode preview"); the real shared call only on the website.

## Working cheaply

Fewer tokens, without testing or checking less (DECISIONS D54). Which checks to run, never again
on an unchanged tree, and flaky tests: "Tests and checks" above.

- Test runs print failures only. This repository has no quiet scripts, so pass the runner's own
  reporter flag: `pnpm test --reporter=dot` (Vitest), `pnpm e2e --reporter=dot` (Playwright).
  Never read a passing run's full output.
- Long logs (installer tests, rehearsals, load checks, CI job logs such as
  `gh run view <id> --log-failed`) go to a file under the git-ignored `.local/logs/`; read only
  the failing part (search or tail), never the whole log.
- Wait for CI with one blocking command, `gh run watch <id> --exit-status` with its output in a
  file, not by polling.
- Read large files by searching first and reading only the lines needed.

## Before reporting

Run `pnpm verify` (once code exists). Report (a big move: "How we check", 4 to 6): lines
before/after per touched file, what was
removed, what was extracted, what was reused, what was noticed but left alone, test results, and for
visible changes what the owner should look at, with the Quick Test seed.
