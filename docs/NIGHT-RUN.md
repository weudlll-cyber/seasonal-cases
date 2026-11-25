# Night runs

The morning sheets of the unattended night chains, newest first.

## Task SC-B1 (2026-11-25)

The nightly Firefox/WebKit run on `master` (45533798067, `073f9ad`): journey 5 failed in all five
projects (`firefox`, `chromium-mobile`, `firefox-mobile`, `webkit`, `webkit-mobile`), 25 others
passed. First error each time: `apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:8570`.
Cause: `browsers.yml` ran no Mailpit service, which journey 5 reads its mails from (`ci.yml` has
it). A test-setup fault; the game behaves the same in every browser. Also found: the workflow
checked out `master` whatever ref it was started for, so it could not test a branch.

Fixed on `kit/v0.17-adoption` (`d023360`): the same pinned Mailpit service as in `ci.yml`; the
checkout takes the ref of the run (the schedule still `master`); the steps that skipped a `master`
without a browser suite are gone (it has one since 1.0.0). Proof: run 45702753156 on the branch,
30 passed (6 journeys in each of the five projects), no flaky. The branch had never run this
workflow; nothing else failed there. Nothing for the kit.

Open: `master`'s nightly stays red until the merge (BACKLOG 74); PR #5 conflicts with `master`
since SC-CI1 (BACKLOG 75).

## Night chain SC-N10 (2026-11-25)

Kit v0.22.0, the whole move (D67 to D69), version `1.1.0-rc.2`. Branch `kit/v0.17-adoption`, draft
PR #5; nothing merged, nothing tagged.

### Final report

**Done (2026-11-25):** pieces 1 to 7 on `kit/v0.17-adoption`, draft PR #5, version `1.1.0-rc.2`; not
merged, not tagged. Kit v0.22.0 in; the kit's backup set up by the installer and drilled on the dev
stack; the kit's CSRF check, headers, cookie, guarded fetch and health routes in place of the game's;
the four CSS patches gone; the download button reshaped; the header's stylesheet-order bug fixed
(BACKLOG 73); what stays the game's recorded (D71 to D74); the block for the kit's planning chat
below. Play-through: the Quick Test show (seed `sc-n1-01`, three openings, "End show" with its
question, result verified) and the privacy round trip (Mailpit link, download through the button,
delete, "deleted player", commitment unchanged and verified) passed on the first run with no console
error; the session's 2 shows, 2 accounts, sessions and mail deleted (counts back to the baseline).
**Needs the owner's hand:** the age key on the VPS (and the first pull and drill there), the GitHub
settings (BACKLOG 59). **Needs the owner's word:** the privacy contact text; BACKLOG 64 (the VPS).
**Open for the kit:** BACKLOG 70. The raw `gh` output and the final head are in the chat report.

### State

| Done    | Running          | Open          | Needs the owner's word / hand |
| ------- | ---------------- | ------------- | ----------------------------- |
| Piece 1 | Piece 2: backups | Pieces 3 to 7 | (collected per piece)         |

### Pieces

| Piece | What                                                                                                                                                                                                                                                                              | Commit                          | CI run                                                                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1     | Pinned v0.22.0 (lockfile at `2e8ed41`), `pnpm kit:check` current; the ADOPTION lines: the brake (v0.15.0) and the step badges (v0.19.0) were done before and are unchanged; `aria-controls` on the bar's panel buttons (v0.20.0); the v0.21.0 and v0.22.0 lines are pieces 2 to 4 | `9b7e52d`                       | PR run green                                                                                                     |
| 2     | Backups (D68): `deploy/lib/backup.sh`, `deploy/backup.sh`, the installer's answer and flag, harness (66 checks), docs, the dev drill (OPERATIONS-CASES.md)                                                                                                                        | `5aff90d`                       | PR run green                                                                                                     |
| 3     | The kit's server parts (D69, D70): `writeCheck`, `securityHeaderSet` + hook (helmet removed), `sessionCookie`, `guardedFetch` (own deleted, BACKLOG 69 closed), `/healthz` `/readyz` (readiness limited)                                                                          | `e54ec31`, `ed80d3c`            | 45677780097 red (e2e), 45680848575 and 45680857889 green                                                         |
| 4     | The four patches deleted; the download button; the axe exclusion tried without and put back (BACKLOG 70 open); the header measured, a stylesheet-order bug fixed (BACKLOG 73)                                                                                                     | `4282a6c`                       | 45686080403, 45686094769 green                                                                                   |
| 5     | What stays Cases' own: D71 to D74                                                                                                                                                                                                                                                 | `25f13aa`                       | 45687219198, 45687228702 green                                                                                   |
| 6     | The block for the kit's planning chat (below)                                                                                                                                                                                                                                     | `6187960`, `5d77de2`, `b3bb143` | 45687968459 red (journey 1's guard), 45689451778 red (axe spec's resize race), 45691834764 and 45691845079 green |
| 7     | The play-through on the dev stack; the screens run into `.local/screens/sc-n10/` (five sizes, both themes, 200 % on phones, headers per role): 256 pictures, 0 findings; the header run 0 findings                                                                                | (this commit)                   | (the chat report)                                                                                                |

### For the kit's planning chat

```text
Seasonal Cases moved to kit v0.22.0 (branch kit/v0.17-adoption, 1.1.0-rc.2, 2026-11-25).

Backup (ops/backup.sh): set up by Cases' installer (prefix cases, native PostgreSQL via
SK_BACKUP_DB_URL + PGPASSWORD, no volumes, secret file cases.env). Drill on the dev stack: backup
41160 bytes in 2.1 s; the kit's drill passed (11 tables, row counts equal, 1 secret file, 34 s);
restore into a wiped copy 1.8 s, row counts equal; the server on the restored copy served the same
show list and an ended show's view byte-equal, its commitment verifying.

Replaced: Cases' CSRF guard (writeCheck), helmet and its options (securityHeaderSet +
securityHeadersHook), its session cookie options (sessionCookie), its own guarded fetch
(guardedFetch, season feed), /api/health and /api/ready (/healthz and /readyz with readiness), and
the four CSS patches of K65.

Stays Cases' own, with reasons (Cases DECISIONS D71-D74): the account feed's plain fetch of the
website's own local http address (not an outside address; allowLocal would be needed); address
limits, stores, the brake's keys, client serving, log and mailer (the kit has no such parts); two
CSS rules that size the docked screen and the start icon (game layout); the result page's text, date
and commitment format.

What did not fit:
1. backup.sh print-units writes After=docker.service and Requires=docker.service: a native install
   has no Docker, so the units would never start. Cases rewrites them to After=postgresql.service.
2. print-units writes ExecStart=<resolved path of backup.sh>; under pnpm that is the package store's
   path, which changes with every kit update. Cases rewrites it to bash + the node_modules path.
3. backup.sh backup fails in Git Bash on Windows (install -m cannot chmod); drill works there. A
   dev drill on Windows needs a Linux container.
4. sessionCookie gives the non-secure (plain http) cookie Path=/ and ignores basePath.
5. header.css: .sk-menu-button { display: none } has the same specificity as bar.css's
   .sk-bar-button { display: inline-flex }, so importing header.css before bar.css shows the Menu
   button while unfolded. Cases had that order since v0.17.0: the button showed beside the links and
   signed-in users got the folded header at 1280. With the order fixed, Cases' header is unfolded at
   1280x720, 1536x768 and 1920x1080 for signed out, player, organiser and admin (name "Alexandra"),
   so the v0.22.0 note "Cases' bar folds at 1280 and 1536" does not hold with it fixed. A more
   specific selector (.sk-header .sk-menu-button) would remove the order trap.
6. axe scrollable-region-focusable on .sk-docked-main (Cases' result page, 1536x768 and 390x844,
   light and dark) is still there on v0.22.0 (Cases BACKLOG 70).

Screens after the move: 256 pictures at five sizes, both themes, 200 % on phones, no finding (text
floor, sideways scroll, ellipsis, game bar one row).

Correction: Cases does have an outward fetch, the website's season feed (since 2026-11-24); it now
goes through the kit's guardedFetch with the website's host allowed.
```

### Choices made without the owner

- **Piece 7.** The first screens run stopped because a test web server did not start within 60 s
  while the machine was busy with another project's tests; run again on an idle machine it passed.
  The game bar kept one row on every phone picture (D60) with the kit's bar; the six-button bar with
  a docked chat is not in the screens run (no chat there).

- **Piece 4, the header.** Measured in a production build (no development items), a signed-in user
  named "Alexandra" with their role, standalone, folded = `data-sk-folded`, height 64 px:

  | Role       | 1280 × 720 | 1536 × 768 | 1920 × 1080 |
  | ---------- | ---------- | ---------- | ----------- |
  | signed out | unfolded   | unfolded   | unfolded    |
  | player     | unfolded   | unfolded   | unfolded    |
  | organiser  | unfolded   | unfolded   | unfolded    |
  | admin      | unfolded   | unfolded   | unfolded    |

  Before the fix (same build) the signed-in roles were folded at 1280 and the Menu button showed at
  every size, folded or not: the order of the stylesheets (BACKLOG 73). The kit's rule was not
  changed. The kit's own measurement says Cases' bar folds at 1280 and 1536; with the order fixed it
  does not for these names.

- **Piece 6's push run was red** (docs-only commit; the PR run of the same commit passed): the new
  guard of journey 1 asked for a hidden Menu button on any wide window, but at 1366 px the admin's
  header may legitimately fold (the kit's measure, font metrics). The guard now states what the fix
  is about: an unfolded header shows no Menu button. So the header table of piece 4 (measured here on
  Windows) holds for this machine's rendering; on another it may fold where the items do not fit.
- **The next push's PR run was red** (its push run passed): the axe spec's early-end loop raced the
  resize (`direct` saw the old bar, then pressed the phone's "Direction" button on a desktop and
  waited until the 10-minute timeout); the two journeys after it failed on the live show it left. The
  loop now waits for the layout the new size must have.
- **Piece 4, axe.** Without the exclusion axe found exactly the old finding (4 times, the result
  page, `.sk-docked-main`), nothing new from the patches' removal; the exclusion is back as it was.
- **Piece 4, the download button.** A `GET` form's submit button (the server names the file), so it
  is a real button with the existing `.button` class; no new style.

- **Piece 3's first push was red** (every journey and the axe run): to keep the journeys' API calls
  allowed, `Sec-Fetch-Site` was set for the whole browser context, which Chromium refuses for a
  `sec-` header (`net::ERR_INVALID_ARGUMENT` on every page load). Cause confirmed by a probe; the
  header is now on each API call only (`OWN_PAGE` in `e2e/helpers.ts`).

- **Piece 3, the headers in production.** The production client was walked under the kit's headers
  in a browser (start, privacy, account, matches, admin, chronicle, a Quick Test stage with an
  opening): fonts load, the stage's styles apply, no style, image or connect violation. One report
  stays, as before under helmet: `script-src eval`, zod's check whether it may compile its parsers,
  caught by zod itself. Noticed, left.

- **Piece 3, Cases' own clients.** The browser client sends `Origin` and `Sec-Fetch-Site` itself;
  the socket upgrade is judged as a write (`writeCheck` with method POST) since it carries the
  cookie; the website stand-in forwards the browser's headers and host; the admin command line talks
  to the database, not over HTTP; the bots run inside the server. Server tests' injected requests and
  the journeys' API calls now name themselves as the page's own (`Sec-Fetch-Site: same-origin`).
- **Piece 3, health.** `/healthz` answers `{status, version}`, `/readyz` the kit's body with the
  version; the old `mode` and `db` fields are gone with the old paths (D70). Readiness is limited to
  60 a minute per address, as the kit notes for the public route (the old route had no limit).
- **Piece 3, the cookie.** The kit puts a non-secure cookie at `/` (plain http: development and the
  browser tests only); production cookies are `__Host-` or `__Secure-` with their own paths.

- **Piece 2, a backup without a key.** The installer sets up no backup without the owner's age
  public key and says so loudly (`NO BACKUP is set up`), rather than refusing to install: with
  `--yes` an install must still be able to run. The key can be added by running it again.
- **Piece 2, the kit's units.** They require `docker.service`; Cases' server has no Docker, so the
  installer rewrites that to `After=postgresql.service` and runs the script with `bash` from the
  installed code (the printed path is the package store's, which changes with a kit update). For the
  kit (piece 6).
- **Piece 2, the drill ran in a Linux container**, because the kit's `backup` command cannot
  `chmod` in Git Bash on Windows (its `drill` does run there). The secret file was a stand-in: the
  dev server's own settings file was not read or copied. One empty test schema left in the dev
  database by an interrupted local test run was dropped.

## Task SC-A1 (2026-11-25)

The accessibility check (D66, BACKLOG 71). `e2e/access.spec.ts` (new, Chromium, in the required
`e2e` job): one pass through the game with one show: sign-in, registration and its pending page,
privacy, the board, My matches, the account page and its delete form, the chronicle, the stage at the
opening, selected, open and owner, the early-end question, the ceremony, the result and the admin's
settings, at 1536 × 768 and 390 × 844 in both themes (about 3 minutes). Reused: the kit's axe
version and call (`@axe-core/playwright` 4.14.0, the kit names no helper), `helpers.ts` (sign-in,
shows, the direction bar; `deleteMailTo` moved there from `screens.spec.ts`).

First run: 78 serious and 48 moderate findings, four rules. Fixed in Cases' own code: the case
buttons' name ("Select Case 3, Ana") did not contain their visible text (a space between the number
and the owner), the phone scoreboard's sideways scroll had no keyboard stop (`tabIndex`), the stage
had no landmark or heading (a `main` with a hidden `h1`; 48 moderate). For the kit: `scrollable-region-focusable` on `.sk-docked-main`
(the result page, every size and theme), excluded exactly, BACKLOG 70. Second run: 0 findings. No
colour was changed: axe found no contrast failure on any screen. The probe test first failed (a lone
10 px button has room around it, which WCAG 2.5.8 allows) and now plants two neighbours.

For the kit's planning chat: see the chat report (one copyable block).

## Night chain SC-N9 (2026-11-25)

Finish SC-N8 and review it: two small fixes, a play-through, an independent security review, the
pictures. Branch `kit/v0.17-adoption`, draft PR #5, version `1.1.0-rc.1`; nothing merged, nothing
tagged. Not part of this chain: the GitHub settings (BACKLOG 59) and the real privacy contact text.

### Final report

**Done (2026-11-25):** pieces 1 to 4 on `kit/v0.17-adoption`, draft PR #5, not merged, not tagged.
Piece 1: the opening showcase and its words are out of the production bundle (BACKLOG 67 closed, 9
strings in `bundle:check`); the folded header's Menu no longer covers the brand at the largest text
(CSS of the game; the new overlap assertion found 6 with the old rule, none now). Piece 2: a whole
Quick Test show, the privacy round trip and a password reset played on the dev stack, all passed,
the session's data deleted again. Piece 3: the sixth security pass, 5 findings, 4 fixed with tests,
1 for the owner (BACKLOG 69). Piece 4: 168 pictures in `.local/screens/sc-n9/`, 0 findings.
**Needs the owner's hand:** the GitHub settings (BACKLOG 59). **Needs the owner's word:** the
real privacy contact text; BACKLOG 69; BACKLOG 64 (waits for the VPS). The raw `gh` output and the
final head are in the chat report.

### State

| Done           | Running                      | Open    | Needs the owner's word / hand                           |
| -------------- | ---------------------------- | ------- | ------------------------------------------------------- |
| Pieces 1 and 2 | Piece 3: the security review | Piece 4 | GitHub settings (hand); the privacy contact text (word) |

### Pieces

| Piece | What                                                                                                                                                                                                                      | Commit        | CI run                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------- |
| 1     | BACKLOG 67: `/dev/opening` behind the DEV flag, 9 strings in `bundle:check`; the folded header's brand keeps its words' width (`shell.css`), an overlap assertion in `e2e/headerSteps.spec.ts`                            | `31dbc3e`     | PR run green (required checks all pass) |
| 2     | The play-through on the dev stack (a throwaway script, not kept): a Quick Test show, privacy end to end, a reset                                                                                                          | `3b11bfc`     | PR run green                            |
| 3     | The sixth security pass (docs/security-pass.md): 5 findings, 4 fixed with tests (last-admin race, export caching, a crash between deletion's steps, NAT64/6to4/Teredo in the guarded fetch), 1 for the owner (BACKLOG 69) | `8740cc3`     | PR run green                            |
| 4     | The pictures in `.local/screens/sc-n9/` (168 pictures, 0 findings; privacy, account, account with the delete form, the website header with three steps in `header-steps/`); the stray `https:` folder deleted from disk   | (this commit) | (next entry)                            |

### Choices made without the owner

- **Piece 2, what was played and found (all passed, nothing needed a fix).** Quick Test with seed
  `sc-n1-01` (12 cases, 3 winners), Begin, three openings (the blank, prize 2, prize 3, each Open,
  Owner, Back to stage), "End show" with its question ("1 prize is still hidden"), the ceremony,
  the result page: "verified", and its commitment equal to the stage's. Privacy: a local account
  registered through Mailpit (the link ends `/confirm#token=...`, no query; the address is clean
  once the token is spent), claimed case 3 in a show, downloaded its data (269 bytes: profile
  `{name, email, role, rank}` and the one match; no hash, secret, recovery code, session or token),
  deleted itself on `/account` with the password: the show shows "deleted player c5bfbf" for
  case 3, the commitment is unchanged and the result page still verifies, neither the result page
  nor the chronicle holds the name, the old password no longer signs in (401). A dump of the whole
  database holds nothing of the deleted accounts (name, e-mail) from the final run. A second
  account did the password reset (link `/reset#token=...`), signed in with the new password, and was
  deleted too. No console error in the run. Not checkable the way the task words it: "My matches"
  of a deleted account (nobody can sign in as it any more) and "deleted player" in the chronicle
  (it lists the winners of ended shows; the deleted player's case was not a winner).
- **Cleanup.** Two runs failed on locators of the throwaway script before the third passed; all
  three left traces, listed first and deleted by explicit show ids and by the accounts created after
  23:57 (8 accounts, 5 shows with 119 events, 3 sessions) and 7 Mailpit mails by id; the counts are
  back to the baseline (4 accounts, 71 events, 2 sessions, 1 credential, 0 pending, 0 mails).
- **Piece 1, the overlap.** The kit lets the folded header's brand shrink to nothing
  (`flex: 1 1 0; min-width: 0`), so at the largest text its name ran under the Menu button. The game's
  CSS now gives the brand `flex: 1 1 auto; min-width: min-content`, and the Menu and the toggle go to
  a row of their own when there is no room. The new assertion (the brand's text boxes against the
  header's buttons) found 6 overlaps with the old rule (all at 200 %) and none with the new one.
  Nothing is asked of the kit's chat.

## Night chain SC-N8 (2026-11-24)

The owner's decisions of 2026-11-24 for BACKLOG 58–66 (D59–D64): the GitHub settings, the phone bar
and the largest text, privacy, the four kit parts, the production bundle and the mail links. Branch
`kit/v0.17-adoption`, draft PR #5, version `1.1.0-rc.1`; nothing merged, nothing tagged.

### Final report

**Done (2026-11-25):** pieces 1 to 5b on `kit/v0.17-adoption`, draft PR #5, version `1.1.0-rc.1`,
nothing merged, nothing tagged. Code head `34de4cd` (this report's commit follows it). Health of the
dev server on this branch: `{"ok":true,"mode":"local","version":"1.1.0-rc.1","db":"ok"}`, client 200
(migration 0004 applied).

Raw `gh pr checks 5` (the last row, `docs pending 6s`, is a stale roll-up entry: that job's run is
`completed success`, see the run list):

```
CodeQL pass / analyze pass / deploy pass / docs pass / e2e pass / security pass x2 / verify pass x2
docs pending (stale, run 45511413660 is completed success) / deploy pass / e2e pass
```

Raw `gh run list --branch kit/v0.17-adoption --limit 10` (newest first): 45511425913 CodeQL success,
45511426705 CI success (PR, head), 45511413660 CI success (push, head), 45508491954 CI success,
45508491959 CodeQL success, 45508479589 CI success, 45507612630 CodeQL success, **45507612540 CI
failure** (piece 5, journey 4: the e2e stand-in's crash, fixed in `cbd9804`), 45507603521 CI success,
45506313824 CodeQL success. The two earlier reds of this chain (piece 3's installer `write_state`,
piece 5's stand-in) were each fixed at their cause before the next piece.

**Needs the owner's hand:** the GitHub settings (RELEASING.md has the read-back and the six commands;
every write was refused in this session). **Needs the owner's word:** the real privacy contact text
(`SC_PRIVACY_CONTACT`) and a legal look at the privacy page before real players; BACKLOG 67 (the
opening showcase page still ships in the production bundle); BACKLOG 64 (waits for the VPS).
**Noticed, left:** the Menu button over the brand at 360 px / 200 % font (piece 5b); the task text
broke off in piece 5, so no later piece was built.

Lines before to after, per piece, in `git diff --numstat 173131d HEAD`: 96 files, +2727 -374. Biggest
new: `AccountPage.tsx` 182, `accountDataRoutes.ts` 127, `PrivacyPage.tsx` 96, `erasure.ts` 67,
`seasonSource.ts` 63, `guardedFetch.ts` 75, `headerSteps.spec.ts` 113; changed: `App.tsx` 160 to
about 200, `Admin.tsx` 165 to 178, `SetupForm.tsx` 190 to 163, `screens.css` 308 to 291, `shell.css`
+23. Removed: the `docked` helper and `data-docked`, `Session.signIn`, the seed and button from
`SetupForm`. Moved to the kit: the back link, the season feed reader, `afterFonts`, `withoutChat`, the
header's step badges. Reused: `RateLimiter`, `useAction`, `TextField`, `DevBoundary`, the kit's
`seasonFeedReader`, `AppHeader`.

### State

| Done                                                                                                                                                                                             | Running | Open   | Needs the owner's hand / word                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------------------------------------------------------------- |
| Piece 1: the settings read back and the commands written down; piece 2: the phone bar and the largest text; pieces 3 to 5: privacy, the four kit parts, the production bundle and the mail links | (none)  | (none) | The GitHub settings (below); the task text breaks off in piece 5 |

### Pieces

| Piece | What                                                                                                                                                                                                  | Commit               | CI run                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| 1     | GitHub settings: read back, the target and the commands in RELEASING.md; D59–D64                                                                                                                      | `fa74f60`            | 45493564174, 45493572118 green                                                             |
| 2     | The phone bar and the largest text (D60): the screens run asserts it; CSS in `moments.css`, `shell.css`, `screens.css`, `stage.css`, `stageParts.css`, `artifact.css`; `e2e/measure.ts`               | `173131d`            | 45498058970, 45498069518 green                                                             |
| 3     | Privacy (D61): `/account` (download, delete), `/privacy`, the erasure (`auth/erasure.ts`, `domain/redact.ts`, `ShowService.forget`), `SC_PRIVACY_CONTACT`, 14 days of logs in the installer           | `b226479`, `855a394` | 45504335501 (red: the installer's `write_state`), 45504821858 green                        |
| 4     | The four kit parts (D62): `back` in `FocusBar`, `seasonSource.ts` + `guardedFetch.ts`, `afterFonts` on the stage and the board, `DockedScreen` `withoutChat`                                          | `60990cf`            | 45506301454, 45506313843 green                                                             |
| 5     | The production bundle and the mail links (D63): the dev form, "Dev sign-in" menu, Quick Test and "Fill with bots" behind the build-time flag; `pnpm bundle:check`; tokens after `#`                   | `283b298`, `cbd9804` | 45507603521 push green, 45507612540 PR e2e red (stub), then 45508479589, 45508491954 green |
| 5b    | Kit v0.19.0 and the header's step badges (D65): the pin, `Account.steps` / `Me.steps` (migration 0004), `account.steps` in `ShellBar`, the chip wrapped in the folded menu, `e2e/headerSteps.spec.ts` | `34de4cd`            | 45511413660 push, 45511426705 PR, both green                                               |

### Choices made without the owner

- **Piece 5b, kit v0.19.0.** Pinned at the tag (object `2ab45ba`, commit `19f0208`, lockfile checked);
  `pnpm kit:check` says current. The 0.18.0 migration names nothing for this game; the 0.19.0 one is
  the header's `account.steps`. The member's steps travel as the kit's `identityFrom` returns them:
  stored in a new `steps` column (migration 0004, default `[]`), sent as `Me.steps` (absent for a
  standalone account), passed to the chip unchanged; no badge type, no filtering of the game's own.
  The wire schema in `@sc/contracts` mirrors the kit's `Step` shape (it must validate on the wire);
  `badges` (icons only) stay for the boards.
- **Piece 5b, what the run found.** The first run of `e2e/headerSteps.spec.ts` (a member with a
  32-character name and three steps; 3 phone sizes, both themes, normal and 200 % font) found the
  chip past the window's edge in the folded Menu in all 24 combinations (the kit keeps the chip on
  one line, `nowrap`). A first version of the check let this pass (a clipped image is still
  "visible"): it now asserts every step's box and the chip's lie inside the window. **The game's own
  CSS fixed it** (`shell.css`: inside the folded menu the chip wraps, the steps drop to a second
  line), so **nothing is asked of the kit's planning chat**. Also found: the kit's `identityFrom`
  makes the game's name of a website name, 24 characters at most with the spaces as underscores, so
  a 32-character website name shows as 24 (the run asserts that); and the stand-in website's step
  icon was one transparent pixel, so the pictures showed blanks: it is now a visible 24 px WebP.
- **Noticed in the header's pictures, left alone:** at 360 px and the 200 % font the brand
  "Seasonal Cases" wraps to two lines and the Menu button sits over its first line (already so in
  the earlier header; the screens run asserts no overlap). The pictures are in
  `.local/screens/header-steps/`.
- **Piece 5's PR run had one red e2e (journey 4), and it was not the game.** The trace shows the
  page's own module requests failing at the moment the stand-in website logged `Unhandled 'error'
event ... write EPIPE`: the stand-in (`e2e/websiteStub.ts`) pipes the socket upgrade between the
  browser and the game with no `error` listener, so a socket reset at the end of journey 3 threw
  and took the whole stand-in down; journey 4 then waited 90 s for a page that never loaded. The
  same commit's push run passed (the race is timing). Fixed at its cause (both ends close on an
  error), not re-run. It has been there since SC-N2.
- **Piece 5, the proof.** The client was built for production and every built file searched for
  `dev/sign-in`, `dev/quick-test`, `Dev sign-in`, `Development sign-in`, `Sign in as organiser`,
  `Quick Test` and `Fill with bots`: the earlier build held six of them, this one none. The search is
  now `pnpm bundle:check` (a CI step, with a test that it finds a planted string). Left in the bundle,
  named: the opening showcase page `/dev/opening` (BACKLOG 67, outside the three tools of D63) and
  the property name `onDevSignIn` (an identifier, no tool).
- **Piece 5, what changed for development.** The Quick Test's button now sits in its own row under
  the seed field (it was beside "Create show") and no longer runs on Enter in the form; both were
  needed to take its words out of the form that production uses. The journeys use the button.
- **Piece 3's first push was red** (the `deploy` job): `SC_PRIVACY_CONTACT`, empty by default, became
  the last answer in the installer's list, and `write_state`'s `[[ -n ... ]] && quoted` ended the loop
  with status 1, which under `pipefail` stopped the install. Fixed with an `if` (`855a394`); the
  installer harness runs only in CI, so it was found there.
- **Piece 4, the season.** The kit's reader reads https only and takes the game's own guarded
  fetch, so the game has one (`guardedFetch.ts`: only the website's origin, every resolved address
  public, no redirect). A website origin that is not https (development) keeps the date's
  season. New shows take the feed's season while its last answer is fresh (the kit's default
  limit); shows already created keep the season they were made in. The address is checked before
  the request, not in it (a name that changes in between is not caught): the origin is the
  operator's own setting, never a visitor's.
- **Piece 4, `withoutChat`.** Every route now sits in `DockedScreen` (`withoutChat` with no chat),
  so a standalone install's pages scroll inside the kit's main area and follow the phone's
  keyboard, as in website mode. The `docked` helper and the `data-docked` attribute are gone.
- **Piece 3, how deletion works.** The account row stays as a tombstone (id, "deleted player"
  plus six characters of the id, role player, rank 0, no badges, deleted); everything that could
  sign the person in again goes first (sign-in data, e-mail, two-factor secret and recovery codes,
  sessions with their sockets, a registration waiting for its mail), then what only shows the name.
  The event log is rewritten too (`redactPlayer` in the domain, `redact` on the event store, the
  PostgreSQL one in a transaction), so no name stays in the database; the shows are folded again
  and announced. The sealed distribution and the commitment are not touched (a test verifies the
  commitment after the rewrite). Standalone deletion and the website feed's deletion are one
  routine. **The feed already signals `deleted`**, so no request to the website's planning chat is
  needed. The last admin cannot delete the account (409, with the sentence what to do first).
- **Piece 3, the logs.** 14 days is a journal namespace of the game's own (`LogNamespace=` with
  `journald@seasonal-cases.conf`), so the host's other logs keep their retention. Development is
  unchanged. Checked by the installer test, not on a real host (there is none yet).
- **Piece 3, the contact** is `SC_PRIVACY_CONTACT` (up to 200 characters), asked by the installer
  as an optional answer; empty shows "the operator of this site". **Needs the owner's word:** the
  real contact text, and a lawyer's look at the privacy page before the first real players.
- **The task text breaks off in piece 5** ("Prove it: build for production and search the built
  files for their identifying strings; the check"). Piece 5 is built as far as it reads: 61 with
  the proof, and 62 (the tokens after `#`) from the opening summary. No piece after it is in the
  text, so none is built; the final play-through and pictures of SC-N7 are not repeated.
- **Piece 2, how it was found and fixed:** the screens run now fails on its own findings
  (`e2e/measure.ts`, with the elements that reach past the window's edge named). Four runs: 36
  findings (all at the 200 % font) → 14 (the bar and the names fixed) → 4 (the forms) → 0. The
  fixes: the fact in the kit's bar wraps and shrinks first (props cannot do that, the game's CSS
  can: `flex-shrink` and `min-width: min-content` on the kit's `.sk-bar-fact` in the phone
  breakpoint), a narrower gutter on 400 px phones (the organiser with the dock's chat has six
  buttons and the row fills to the pixel), owner names and artifact names wrap, fields and labels
  may shrink. The dock's case (six buttons) is not in the screens run, which has no chat; a probe
  on the dev stack measured it: 44 px at 390 and at 360 px. **Nothing was needed from the kit.**
  The probes wrote to the dev database again and were deleted again, by explicit criteria after
  listing (15 accounts, 7 shows, 5 pending registrations, 5 mails).
- **Piece 1 could not be applied.** Every write call to the repository's settings (`gh api -X
PATCH`, `PUT`, `POST`) was refused by this session's permission layer, though the task asks for
  them. The task says a setting the API refuses is left and listed, so: nothing was changed; the
  state before is read back in RELEASING.md, with the target and the six commands. **Needs the
  owner's hand:** run those commands (or click Settings, General; Branches; Rules; Code security;
  Actions, General), and read the table back.

## Night chain SC-N7 (2026-11-24)

The owner's decision of 2026-11-24 (D56): Cases takes the whole kit now, before the VPS: kit
v0.17.0, the kit's `AppHeader` in place of the game's own header, the whole game checked against
the kit's handbook. Branch `kit/v0.17-adoption` from master `073f9ad` (v1.0.0), draft PR, version
`1.1.0-rc.1`; nothing merged, nothing tagged.

### Final report

All four pieces are done and pushed on `kit/v0.17-adoption`; the draft PR is #5; nothing is
merged and nothing is tagged. Version `1.1.0-rc.1`. The raw `gh pr checks` and `gh run list`
output is in the chat report of the chain.

**Done:**

1. **Kit v0.17.0 and the migrations of 0.12.0–0.17.0** (D56, D57): the 49 tokens are `--sk-…`;
   "Applaud" is the kit's press button and the Chat button the kit's hook (through a bridge, since
   the bar sits above the dock); the kit's `FailureBrake` under sign-in's three keys; the
   stand-ins and `packages/ui/src/pending/` are gone; BACKLOG 41, 43 and 49 closed.
2. **The kit's `AppHeader`** (D58) with its folded Menu in place of the wrapping one, the dev
   tools in a development build only.
3. **The game against the kit's handbook:** the replacements that keep the look, and the rest as
   an open list (BACKLOG 58–65).
4. **The checks, the play-through and the pictures:** `verify`, `security`, `docs` and `e2e` green
   on the draft PR after one fix (below); a whole show played on the dev stack; 132 pictures.

**A correction of my own:** "3 prizes left" on the phone was never cut (BACKLOG 57), and the
merge of the release left a stray `|||||||` block in HANDOVER and DECISIONS on master (removed
here).

**Running for the owner:** the dev server (127.0.0.1:3970) and client (http://localhost:5470, the
phone http://192.168.0.66:5470) on this branch, PostgreSQL and Mailpit; Quick Test seed
`sc-n1-01`.

**Look at first:** the header (the Menu on a phone), the game bar's Applaud and Chat buttons, the
two rows of the phone bar with the chat button (BACKLOG 65), and `.local/screens/sc-n7/` with the
`-font200` pictures (BACKLOG 66).

### State

| Done       | Running | Open   | Needs the owner's word                                                                                                                                                                                                             |
| ---------- | ------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pieces 1–4 | (none)  | (none) | BACKLOG 58–66: privacy, the GitHub settings, kit parts with a visible change, dev tools in the bundle, link tokens, coverage, before production, the phone bar, the phone at its largest text; the header's missing website badges |

### Pieces

| Piece | What                                                                                                                                  | Commit                            | CI run                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| 1     | Kit v0.17.0 (D56): tokens `--sk-…`, `presses`, `useOpenDockChat`, the kit's `FailureBrake` (D57), `pending/` gone, version 1.1.0-rc.1 | `dfdfbc1`                         | (below)                                                                               |
| 2     | The kit's `AppHeader` (D56, D58): `ShellBar.tsx`, `DevTools.tsx`, header.css, the Menu fold; journeys on the kit's test ids           | `d3b2b33`                         | 45476362886 push, 45476378028 pull request: `e2e` red, the same cause (below)         |
| 3     | The game against the kit's handbook: the replacements that keep the look, the list (BACKLOG 58–65)                                    | `9c4770e`                         | 45477786449 push, 45477801145 pull request: `e2e` red (below)                         |
| 4     | The e2e fix (`DevBoundary`, the Vite cache and `optimizeDeps`); the play-through; the pictures; the final report                      | `01a9c28` and the commit after it | 45480501571 push, 45480514499 pull request: `verify`, `security`, `docs`, `e2e` green |

### Choices made without the owner

- **The chat button's hand-over goes through a bridge.** `useOpenDockChat()` works only inside
  `DockedScreen`'s children; Cases' game bar is a sibling above the dock. Moving the bar into the
  dock's scrolling area would change the stage's height (the stage fills that area), and this
  piece keeps today's behaviour. So `shell/DockChatBridge.tsx` renders nothing inside the dock and
  hands the kit's function to the bar through a ref. Left for the kit's planning chat: a bar
  outside the dock cannot use the hook without such a bridge.
- **"Applaud" moved from the bar's lead to the kit's `presses`,** which the kit places after the
  toggles and before the panel buttons. Its function is unchanged; its place in the bar is the
  kit's.
- **A mistake of the release step, found and fixed in this piece:** merging `docs/working-cheaply`
  into the release branch left git's three-way marker line `|||||||` and the old base text in
  `docs/HANDOVER.md` and `docs/DECISIONS.md` on master (v1.0.0). My check looked for the other
  markers, and Prettier had indented this one. Both stray blocks are removed here; master carries
  them until this branch is merged.
- **The header's pieces:** the pages, the chip "name (role)" (a player's rank in it), "Sign out",
  "Sign in" for a guest (to the start page, where the sign-in and the registration forms are;
  no "Register" link, since it is the same page), the Quick Test link (to the admin area, where
  the Quick Test button is) and the "Dev sign-in" menu with an organiser, an admin and three
  players of ranks 0, 2 and 5, both only in a development build. No `foldBelow`: the kit's
  measured fold decides. The start page's own dev sign-in form stays.
- **Dropped from the header, for the owner's word:** the player's website step badges next to
  the name (`AppHeader`'s chip has no slot for them). Nothing in the game depends on them: the
  board, the lower third and the players panel show the badges; journey 4 now checks the icon's
  source on the board.
- **`useShellHeight` and `--shell-height` stay:** the stage, the board and the bar's panel read
  it. The hook measures the kit's `.sk-header` inside a box-less wrapper.
- **Links without a reload:** the kit renders plain anchors, so one delegated click handler moves
  between the game's own pages with `navigate` (the website login hop and modified clicks are
  left to the browser).
- **"3 prizes left" was never cut** (measured at 390 × 844 and 360 × 780): on a phone it is the
  kit's read-out (a 1 × 1 px visually hidden box), which my cut counter took for a cut, and I
  repeated it in the SC-N6 and SC-R1 reports. What is real: at 360 px "24 cases left" is cut,
  and where the dock's chat button joins (the dev stack, and website mode) the bar holds six
  buttons and a fact, wraps to two rows (92 px) at 390 and 360 px, and so the owner's phone
  shows two rows. Cases can fix it without the kit (a smaller gutter, a shorter fact, one button
  less in the bar); each changes what the owner sees, so none is built: for the owner's word.
- **Piece 3, the audit.** The handbook's rules read against Cases; replaced, same look and
  behaviour: the season colours (`rgb(249 168 37 / 45%)` and two more) as the kit's tokens through
  `color-mix`; an opened case's hidden artifact name as `sk-visually-hidden` (a `nameHidden` prop
  on `ArtifactEmblem`); the stage's night, dusk and spotlight, the gem's gloss and shade and the
  case's lining as named arena tokens in their own files. Not replaced, because each would change
  what the owner sees or settings only he holds: BACKLOG 58–65 (privacy, GitHub settings, the
  back link in the game bar, the season feed, `afterFonts`, `withoutChat`, dev tools in the
  bundle, link tokens, coverage, before production, the phone bar).
- **Files from Mini Games** (`.gitleaksignore`, `Dockerfile`, `ops/`): the handbook names them as
  where a game that lacks them finds the later pins, not as a rule for every game, so none is
  added. Cases has the template's own files (workflows, lefthook, Renovate, ESLint, Prettier,
  tsconfigs, LICENSE with `AGPL-3.0-or-later` in every `package.json`, CONTRIBUTING, SECURITY).
- **No privacy document written:** the handbook asks for one with "how long" and "deleted when"
  for each item, and Cases has no deletion at all; writing those lines would invent a rule.
- **The GitHub settings were only read** (GET), not changed.
- **A production build was made once** (a few seconds) to run the kit's own bundle check; the
  kit's three dev markers are absent and so are the new header's dev parts.
- **`e2e` went red on piece 2's commit (5 of 6 journeys in Chromium)** and stayed red on piece 3's
  (I read CI only after piece 3, so the first red was read on `9c4770e`; piece 1 was green), and
  the cause was mine: the new header loads the kit's `DevSignIn` lazily in a development build, the e2e client
  is Vite's dev server on a cold cache (two of them start at once, on one dependency cache), and
  the trace shows Vite discovering the module late, building a second optimisation with its own
  copy of React; the kit's hook threw ("Invalid hook call") and, with no error boundary, the page
  unmounted. Journey 4 (website mode, where the menu is not rendered) passed. My warm local cache
  hid it, and a cold start with a shared cache did not reproduce it here. Fixed three ways: the
  quick tools sit in an error boundary (`DevBoundary`), `optimizeDeps.include` names the kit's
  dev module, and each mode's dev server has its own cache folder. The next run is the check.
- **The play-through** (a script of assertions, `.local/tools/playthrough.ts`, not a picture
  review): Quick Test seed `sc-n1-01`, Begin, three openings (the main prize and two cases without
  a prize: Open, Owner, Back to stage), "End show" early with its question naming two hidden
  prizes, the ceremony, the result page with the commitment verified, a local account registered
  through Mailpit's confirmation link and signed in. It found nothing in the game. Two things of
  mine: my bar probe had left two live Quick Test shows in the dev database (with them live the
  stage prefers them to a show that has ended), and the first run of the script had a locator
  that the dock's chat made ambiguous. Both fixed; **everything this session made on the dev
  stack was deleted again** (ten accounts, five shows' events, two mails), each by an explicit id
  or time window, after listing it; the older shows and accounts are as they were.
- **The pictures** (`.local/screens/sc-n7/`, not opened): four sizes in both themes, the phone
  sizes again at a 200 % root font. The measurements: none at the four normal sizes; at 200 %
  the sideways overflow and the cut labels of BACKLOG 66.
- **The eviction test** of sign-in's brake now covers the kit's rule (a full map refuses a new key
  and keeps every held count): D57.

## Night chain SC-N6 (2026-11-23)

The owner's decisions of 2026-11-23 (D46–D49): D42–D45 confirmed, kit v0.11.1, sign-in's brake
against guessing, and the case on the stage as a real case that opens. Branch `proto/cases-v1`,
continued; nothing merged.

### Final report

All four pieces are done and pushed on `proto/cases-v1`; nothing is merged. The version stays
`1.0.0-rc.3`.

**Done:**

1. **Kit v0.11.1, the brake, the phone label** (D46–D48):
   - the kit is on v0.11.1 and `pnpm kit:check` says current; no part Cases uses changed;
   - the brake against guessing is back in front of the password check and before the cap counts
     (`signInBrake.test.ts`);
   - "Unclaimed" is whole at 360 and 390 px (88 px phone columns);
   - D42–D45 are decisions now.
2. **The case that really opens** (D49): `stage/CasePicture.tsx` draws the case in CSS 3D with SVG
   art (trim, handle, latches, lid on a back hinge, dark lining in the season's colour). It is
   used by the centre case, the cases on the stage and the ceremony. The opening's phases are
   named in `motion.ts`. Under reduced motion the open end state shows at once. CONCEPT 1.10 §7.
3. **`/dev/opening`:** the opening alone, with replay, speed (normal, half, quarter) and season;
   404 outside development.
4. **Pictures and review:**
   - 68 stage pictures in `.local/screens/proto-v5/` (0 findings, now also counting cut labels);
   - 54 frames of the opening and one under reduced motion in `.local/screens/opening-frames/`,
     with the phase checks;
   - a fifth independent review: seven findings, all low; six fixed, one for the owner.

**Checks:** `pnpm verify` green (48 files, 244 tests, kit current); journeys 1–6 in Chromium
passed; CI green for every pushed commit (ids below).

**Look at first:**

- `.local/screens/opening-frames/` (000 → 100, PC and phones, both themes);
- `open-*` and `ceremony-*` in `proto-v5`;
- `/dev/opening` on the running dev server (quarter speed shows each phase).

**Needs your word:**

- D48 as built: every try counts, so for one address the brake is always stricter than the cap,
  and a room of more than 20 behind one address waits up to 15 minutes to sign in.
- The review's finding 6: whether a screen reader still announces the risen artifact's name. It
  is inserted hidden until 55 % and only shown later; not tested with NVDA here.
- On 1280 × 720 and 1536 × 768 the risen artifact covers part of the inner row's two middle,
  dimmed cases.

**Left alone:** the kit bar's "3 prizes left" is cut on a 390 px phone (the kit's `GameBar`).

### State

| Done       | Running | Open | Needs the owner's word                                                                         |
| ---------- | ------- | ---- | ---------------------------------------------------------------------------------------------- |
| Pieces 1–4 | —       | —    | D48's effect on a room behind one address; the review's finding 6; the inner row at 1280 × 720 |

### Pieces

| Piece | What                                                                                                                                                                                                                             | Commit    | CI run             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------ |
| 1     | Kit v0.11.1 (D47); sign-in's brake (D48); "Unclaimed" whole at 360 and 390 px; D46                                                                                                                                               | `1c9e32a` | 45242757137, green |
| 2, 3  | The case that really opens (D49): `CasePicture.tsx`, `case.css`, `caseOpening.css`, the phases in `motion.ts`, centre, stage and ceremony; `/dev/opening` (404 outside development); one commit, as both are wired in `main.tsx` | `d78d230` | 45252285613, green |
| 4     | The opening's frames (`e2e/openingFrames.spec.ts`); the fifth review's fixes                                                                                                                                                     | `ea2261e` | 45256545230, green |

### Choices made without the owner

- **The task text ends inside piece 3** ("…development only (404 otherwise, with a test): the").
  Piece 4 and anything after it are not in the text. Taken from what is there and the budget
  rule: piece 3 is the page `/dev/opening` in development only (404 otherwise, with a test), with
  a replay button and a speed selector; piece 4 is the pictures, the opening's frames first, and
  a review (the budget rule names "the review" as never dropped).
- **D48, read as "as it was before SC-N4 piece 3":** every try counts, as Mini Games'
  `loginIp` (20 per 15 minutes per address) and `loginAccountIp` (5 per 15 minutes per login and
  address) count them, since the kit's RateLimiter can only take, not look first. The
  per-account part is the per-login-and-address 5 that never went away; there was no separate
  20 per account before SC-N4. For your word: with every try counted, the brake (20 per 15
  minutes) is always stricter than the cap (20 a minute) for one address, so the cap never
  answers first, and a room of more than 20 behind one address waits up to 15 minutes to sign
  in.
- **"Unclaimed" fits by width, not by a smaller label or a second line:** the kit's text floor
  is 14 px, and "Unclaimed" at 14 px needs about 70 px; the phone's case columns went from 78 to
  88 px (they scroll sideways already).
- **A new check in the screens run:** labels cut with an ellipsis are counted and named in
  `checks.json`. It found two others, never measured before: an opened case's artifact name
  ("Halving Stone", all sizes; piece 2 redraws the opened cases) and the kit bar's "3 prizes
  left" on the phone (the kit's `GameBar`, reported, not changed).
- **Corrected in piece 2:** the artifact name was the stage's text kept for screen readers only
  (a 1 px clipped box), not a cut; the check now skips such boxes. Only the kit bar's "3 prizes
  left" stays.
- **"The artifact emblem stays the kit's":** the emblem is this game's own `ArtifactEmblem`, not a
  kit part; read as "the emblem stays as it is", and it is used unchanged in the case.
- **The case is drawn as CSS 3D faces with SVG art,** not one SVG drawing: SVG elements take no 3D
  transforms, and the lid has to turn about its back edge in perspective. Back, sides and floor
  are lined dark; the front carries the SVG trim, the latches and the number; the lid has its
  outer face with the handle, a lined inner face and a lip.
- **The 300 ms beat after "Back to stage" stays** (`closeMs`) as the pause before the opened case
  travels home with its lid open; the lid no longer closes, so the way home takes as long as
  before.
- **The cases on the stage lost their card** (border and background): the case itself is the
  token now, its number on the front, the owner's name below.
- **The ceremony** opens each winner's case as it comes (the same opening); the winners before
  keep their small gem.
- **The fifth review (piece 4):** seven low findings. Fixed: D48 cited in place of D46 in the
  sign-in code; a test comment about the refill; the reduced-motion check now proves the lid is
  open (its matrix); the unused `--open-ms` and `--close-ms` variables removed; the open-state
  selectors scoped to `.case-picture`; the cases on the stage keep the same room above closed
  and open, so an opened case no longer sits lower on the arc. For the owner: finding 6 (a
  screen reader and the risen artifact).
- **On a wide, short PC window (1280 × 720, 1536 × 768)** the front case is smaller (`--cw` 160 at
  fit 1), but the risen artifact still covers part of the inner row's two middle cases, which are
  dimmed at that moment. Left as it is for the owner to see in the pictures.

## Day chain SC-D5 (2026-11-23)

The owner's decisions of 2026-11-23 (D40–D45): kit v0.11.0, the kit-version watch, and four
proposals that stand until the owner says otherwise (registration with confirmation, a letter in
every name, applause per account or address, separate address budgets). Then the browser matrix,
a review, the play-through and the hand-over for the evening test. Branch `proto/cases-v1`,
continued; nothing merged.

### Final report

All five pieces are done and pushed on `proto/cases-v1`; nothing is merged. Version
`1.0.0-rc.3`.

**Done:**

1. **Kit v0.11.0 (D40):** four stand-ins replaced by the kit's parts. The bar's chat button
   shows the dock's unread count. The open rounds come from the kit's publisher. Recovery codes
   are keyed with the new `SC_RECOVERY_KEY`, and codes stored before still work. "Applaud"
   (BACKLOG 41) and the chat hand-over (43) stay as stand-ins.
2. **The kit-version watch (D41):** `pnpm kit:check` runs last in `pnpm verify` and as a CI step
   with a warning annotation. Today: `kit: pinned v0.11.0, newest v0.11.1, 1 release behind`.
3. **The four proposals (D42–D45):**
   - registration through a confirmation link;
   - a letter in every name;
   - applause per account, or per address for guests;
   - sign-ins 20 and claims 300 a minute per address.
4. **The browser matrix:** 36 of 36 passed, under 68–100 % CPU from other sessions. Firefox's
   failures were load. Journey 6 has an admin per project.
5. **A fourth independent review:** nine findings, none high. Seven are fixed, among them a
   pre-hijack of a waiting registration's password. 66 pictures in `.local/screens/proto-v5/`,
   all looked at; the phone bar's lead is hidden again.

**Running for the evening test** (restarted on rc.3, PostgreSQL, health `db: ok`):

- server: 127.0.0.1:3970;
- client: http://localhost:5470 (phone http://192.168.0.66:5470);
- Mailpit: http://localhost:8570;
- Quick Test seed: `sc-n1-01`.

**The confirmation link, step by step:**

1. On the start page choose "Create an account"; give a name with a letter, an e-mail and a
   password of 12 characters or more; press "Create account".
2. The page says a mail tells you how to go on. Signing in now fails like any unknown name.
3. Open Mailpit (http://localhost:8570): the mail "Confirm your Seasonal Cases account" names
   the account and holds the link.
4. Open the link, press "Confirm"; the page says the account is ready.
5. Choose "Sign in" and sign in with the name or e-mail and the password.

**Needs the owner's word:**

- the four proposals D42–D45 (HANDOVER);
- the review's questions (security-pass.md, fourth pass, "For the owner"), above all sign-ins at
  20 a minute per address against the old 20 per 15 minutes;
- the kit pin to v0.11.1;
- the HANDBOOK deviations (HANDOVER).

**Noticed, left alone:**

- the empty `https:/example.org/cases.git` folder from the installer test of 2026-11-21;
- the ceremony's phone cases cut "Unclaimed" to "Unclaim…".

### Pieces

| Piece                     | Done | Running | Open | Needs the owner's word         | Commits, CI                                                        |
| ------------------------- | ---- | ------- | ---- | ------------------------------ | ------------------------------------------------------------------ |
| 1 Kit v0.11.0             | yes  |         |      | HANDBOOK deviations (HANDOVER) | `d888d96`, CI 45136922671 green                                    |
| 2 The kit-version watch   | yes  |         |      | the pin to v0.11.1             | `02bf9fb`, CI 45143064781 green (the warning shows)                |
| 3 The owner's four items  | yes  |         |      | the four proposals (D42–D45)   | `6a91c93`, CI 45147973538 green                                    |
| 4 The browser matrix      | yes  |         |      |                                | with the review's fixes, below                                     |
| 5 Review, play, hand-over | yes  |         |      | the review's questions         | `52dc6ef` (CI 45158153327 green), `79113d5` (CI 45159917597 green) |

### Choices made without the owner (SC-D5)

- **The recovery key.** The kit hashes recovery codes with HMAC-SHA-256 and a key since v0.9.0
  (kit K20). New setting `SC_RECOVERY_KEY` (64 hex digits, never one byte repeated), required in
  production and in any run with a database, like `SC_DATA_KEY`; without a database a new random
  key per start, like the cookie secret. The installer makes it once and keeps it; the
  development key is in `apps/server/dev.env`. Codes stored before (plain SHA-256) still work
  until used, through the kit's second lookup (kit K27).
- **The bar's chat button** carries the dock's unread count and opens the dock's own chat (the
  phone's sheet, or the focus into the desktop strip), because the website's chat is mounted once
  in the dock; it has no panel of its own.
- **Open rounds in local development** are empty now: the kit's publisher leaves out a round
  whose join address is not https, which the website would refuse as well.
- **BACKLOG 32 closed with the others:** the kit's bar shrinks its facts and wraps its buttons,
  so the lead "Seasonal Cases" shows on a narrow phone again.

### Piece 5 report

**The review.** A fresh agent reviewed `e6990c5..6a91c93` against CONCEPT §8/§10, CLAUDE.md
and the kit's HANDBOOK. It found nine findings, none high (security-pass.md, "Fourth pass").

Fixed, each with a test:

- **1, medium:** a later registration for the same e-mail replaced the waiting name and
  password. The mailbox's owner then confirmed the attacker's password. Now the first form stays
  and only the link is renewed; the mail names the account.
- **2:** the mail budget is taken before the row changes.
- **4:** `X-Forwarded-For` is walked past every trusted hop.
- **5:** the recovery key may not be the data key.
- **6:** a dropped open round is logged once.
- **7:** the chat hand-over moved to `pending/` (BACKLOG 43) and leaves an open sheet open.
- **9:** the decisions heading, a `names.ts` sentence, and the confirm page drops its spent
  token.

Left for the owner: 3 (sign-in tries per address) and 8 (one extra `git ls-remote` in CI,
which the task asks for).

**The pictures.** `.local/screens/proto-v5/` (proto-v4 deleted): 66 pictures at 1536×768,
1280×720 and 390×844, light and dark. They show sign-in, the registration's pending page (new),
the start page, opening, selected, open, owner, the direction panel, the early end, the ceremony,
the result and the admin's settings. The checks found no text under 14 px and nothing scrolling
sideways. I looked at every screen kind at each size.

- **Fixed:** on a phone, the kit's bar showed the lead "Seasonal Cases". That cut the fact to
  "24 cas…" and wrapped the buttons into a second row, which the direction panel covered. The
  lead is hidden up to 480 px again (`moments.css`); re-shot, the bar is one row.
- **Fixed:** a re-shoot failed once with "Cannot fast-forward to the past". The ceremony's
  clock pause had a 10 ms margin, which a loaded machine overran; it is 250 ms now.
- **Left:** the ceremony's phone cases show "Unclaim…".

**The play-through.** The journeys covered it in all three browsers at both sizes:

- the Quick Test to the result;
- registration through the link via Mailpit;
- the recovery codes re-issued;
- the sound toggle (unit test) and "Applaud" (pictures, unit and socket tests).

The owner's dev server was restarted on rc.3 (health `db: ok`). I made no accounts in the
development database, so there is nothing to clean up there.

**Version:** `1.0.0-rc.3` in every package.json, README, RELEASING, CONCEPT §12, OPEN; the
CHANGELOG has its section.

**Tests:** the final `pnpm verify` green (45 files, 229 tests, then the kit line); journeys 1–6
in Chromium after the last change all passed (1.6 min).

### Piece 4 report

**The load.** One minute measured at 10:37: 100 % CPU, 6.2 GB of 31.4 GB free. The CPU came from
Seasonal Party's sessions (headless Chrome screenshot probes) and WSL (Docker), not from this
project. I waited ten 2-minute rounds (10:39–11:01): 91.7, 91.8, 91.7, 99.9, 95.2, 91.0, 76.2,
76.2, 82.0 and 68.3 % CPU, 2.3–6.3 GB free. The run then started anyway, as the task says.

**The matrix.** One project per run, so each had a fresh e2e server; journeys in order.

| Project         | Result | Run   | Journeys 1 / 2 / 3 / 4 / 5 / 6                |
| --------------- | ------ | ----- | --------------------------------------------- |
| chromium        | 6 / 6  | 446 s | 1.9m / 1.5m / 1.1m / 42.5s / 19.6s / 15.7s    |
| chromium-mobile | 6 / 6  | 309 s | 1.0m / 28.2s / 50.7s / 44.4s / 19.8s / 15.6s  |
| firefox         | 6 / 6  | 253 s | 56.8s / 27.7s / 47.3s / 41.6s / 19.9s / 19.4s |
| firefox-mobile  | 6 / 6  | 234 s | 1.3m / 32.1s / 24.0s / 26.5s / 14.5s / 16.1s  |
| webkit          | 6 / 6  | 312 s | 1.4m / 1.4m / 44.9s / 45.2s / 17.3s / 15.5s   |
| webkit-mobile   | 6 / 6  | 257 s | 1.5m / 36.4s / 50.4s / 32.2s / 12.9s / 12.4s  |

**What it means.**

- **Firefox:** last night's failures did not repeat, so there was no regression to fix; they were
  load.
- **Chromium at phone size:** passed all six, so the order of the journeys did not matter this
  time. Journey 2 still finds a show that journey 1 leaves live (the start page follows a live
  show first). That stays as it is, since it did not show.
- **Journey 6:** it now signs in as its own project's seeded admin (`e2e/rootAdmin.ts`
  `rootFor`, `e2e/server.ts`), so a run of several projects against one server passes too, as
  the nightly does.

Lines: `rootAdmin.ts` 15 → 38, `server.ts` +21/−17, `journey6.spec.ts` +8/−6. BACKLOG 40 is
closed.

### Piece 3 report

The four proposals of 2026-11-23 (D42–D45), built:

1. **Registration with confirmation (D42).** The form stores a pending registration
   (`auth/pending.ts`, PostgreSQL `db/pendingStore.ts`, migration 0003): name, e-mail key,
   password hash, the token's sha256, 24 hours. It mails `/confirm?token=…` and answers the same
   neutral page as before. A taken e-mail gets the "an account exists" mail. A second
   registration of the same e-mail answers alike and mails a new link no sooner than a minute
   later; the old link stops working. `POST /api/auth/confirm` makes the account once; a used,
   replaced or expired link answers 400. The name is reserved only by an account: the first link
   used wins, the other answers 409. Expired registrations are purged on every registration and
   at the start. The client's `/confirm` page has one "Confirm" button. Sign-in is unchanged: one
   answer, one time for an unknown name and a wrong password.
2. **A letter in every name (D43):** `---`, `123` refused.
3. **Applause per account or address (D44):** 5 a second per account, or per address for guests;
   guests may applaud. The socket's address comes from `socketAddress.ts`.
4. **Separate address budgets (D45):** sign-ins 20 a minute, claims 300 a minute
   (`addressLimit.ts`). The per-player and per-socket limits stay.

Choices made without the owner:

- **Same name, different e-mail, while one is waiting:** each e-mail keeps its own pending
  registration and its own mail. "Refreshes the mail" is read as the same e-mail's.
- **Without mail set up, registration answers 503,** as the forgotten password does, since no
  link could reach anyone.
- **The sign-in's old 20 per 15 minutes per address is gone:** it would have held a room back
  long before the new 20 a minute. The 5 per login and address stays.
- **The confirm page needs a press,** not the page's load, so a mail program that opens links
  makes no account.

Lines (added/removed; new files in full):

- new: `auth/pending.ts` 60, `db/pendingStore.ts` 65, migration 0003 15, `socketAddress.ts`
  49, `ConfirmPage.tsx` 59, `registerRoute.test.ts` 184, `socketAddress.test.ts` 42;
- changed: `registerRoute.ts` +105/−42 (192), `testing/harness.ts` +41/−5 (a default mailbox
  and `register`, which follows the mailed link), `localRoutes.test.ts` +6/−73 (its registration
  tests moved to `registerRoute.test.ts`), `securityPass2.test.ts` +38/−22, `applause.ts`
  +22/−7, `applause.test.ts` +40/−11, `addressLimit.ts` +15/−10, `realtime.ts` +13/−7 (299),
  `localRoutes.ts` +11/−9, `app.ts` +11/−6, `journey5.spec.ts` +20/−5, `CONFIG.md` +27/−10
  (mail and the limits table), `security-pass.md` +31, CONCEPT 1.9.

Reused: the reset link's pattern (`tokenHash`, base64url token, the `?token=` page), the kit's
`RateLimiter` and `trustedPeers`, `addressKey`, `mailbox`. Extracted: `registerThrough` and
`linkOf` in the harness; `clappers` in `socketAddress.ts`, so `realtime.ts` stays under 300.

Tests:

- server: 19 files, 105 tests;
- new: the link flow (6 tests), 503 without mail, the letter rule, the applause per account and
  per address, the socket address (4), the two budgets (2), the PostgreSQL pending store;
- journeys 1–6 in Chromium: all passed, journey 5 through the link via Mailpit's API.

### Piece 2 report

`pnpm kit:check` (`tools/kitVersion.ts`, 80 lines; the parsing in `tools/kitVersionParse.ts`,
107 lines) prints, today: `kit: pinned v0.11.0, newest v0.11.1, 1 release behind` and the
heading `## [0.11.1] - 2026-11-23`. v0.11.1 is the kit's same-day patch: wider peer ranges and
its own Renovate rules, nothing to do for Cases by its migration note. The pin stays.

- **Where it runs:** last in `pnpm verify`; in CI's `verify` job a step `pnpm kit:check --ci`
  writes the line to the job summary and a `::warning::` when behind, with
  `continue-on-error`. Without the network it says so (checked with a dead proxy: exit 0).
- **Renovate:** a rule for datasource `github-tags` and `weudlll-cyber/seasonal-kit` (also
  matched by `@seasonal/kit`), its own group "seasonal kit", any time, no wait, no auto-merge.
  Renovate's npm manager reads `github:owner/repo#tag` dependencies this way. The rule is not
  run here: the app is not enabled (HANDOVER "Needs the owner's hand") and the validator is not
  installed. The script stays the one source.
- **Docs:** CLAUDE.md "Hygiene" says to refresh the HANDOVER "Kit" line at the end of every
  chain; HANDOVER has the line; D41.
- **Tests:** `tools/kitVersionParse.test.ts`, 9 tests in a new Vitest project `tools`
  (`tools/vitest.config.ts`). They cover:
  - the pin in dependencies and devDependencies, and none without a tag;
  - the tag list: peeled and non-semver refs left out, semver order (`v0.10.0` after `v0.9.1`);
  - the releases after the pin, and their headings;
  - current, one release, several releases;
  - skipped and missing headings, and an unknown newest.
- **Lines:** new `tools/` files 80, 107, 120 (the test) and 15; `package.json` +2/−1; `vitest.config.ts`
  +2/−2; `tsconfig.json` +2/−2; `ci.yml` +9/−1; `renovate.json` +9/−1; CLAUDE.md +1.
- **Reused:** Node's `execFile` through `promisify`. No new dependency (tsx was already a root
  devDependency).

### Piece 1 report

Kit `v0.11.0` in all four package.json files (lockfile: `version: 0.11.0`), the migration tables
of 0.9.0, 0.9.1, 0.10.0, 0.10.1 and 0.11.0 followed:

- **0.9.0:** `recoveryHash(code, style, key)` with `SC_RECOVERY_KEY`, look-ups with
  `recoveryLookups` (`code_hash = ANY($2)` in PostgreSQL); `WebsiteChatFrame` without
  `sandboxed`. The header and dev tools: the game keeps its own (HANDOVER, deviations).
- **0.9.1:** the back link's arrow is hidden from screen readers; journey 4 finds the link by
  "Seasonal Entertainment".
- **0.10.0:** `GameBar` `time={null}`. Not used here: `RequestHeaders`, `BarIconName`'s
  `expand`, `devStubPlugin`, `AppHeader`'s order, `signIn.href`. The focus ring needs nothing.
- **0.10.1:** `data-fit-fixed` → `data-sk-fit-fixed` (five files). No other renamed attribute is
  read here.
- **0.11.0:** the stand-ins replaced as ADOPTION.md's Cases table says:
  - `useFitScale('cases')` with the kit's floors; `fit-cases.css` deleted;
  - the kit's `useDockReserve` and `OriginChatFrame`;
  - `GameBar` `toggles` for the sound;
  - `DockedScreen` `onUnread` into the chat button's `badge`;
  - the lead shows on a narrow phone again;
  - `openRoundsPage` for the open rounds.

What stays under `packages/ui/src/pending/`: `BarPress.tsx` ("Applaud"). The kit's actions open
panels and its toggles switch a setting; neither sends a single press (BACKLOG 41, from 36).

Lines before → after:

- deleted: `BarToggle.tsx` 54, `OriginChatFrame.tsx` 53, `useDockReserve.ts` 33,
  `fit-cases.css` 17;
- new: `apps/web/src/shell/useChatHandOver.ts` 35;
- changed (added/removed): `openRoundsRoutes.ts` +34/−18, `config.ts` +18/−2, `twoFactor.ts`
  +12/−9, `FocusBar.tsx` +16/−10, `App.tsx` +15/−7, `RegistrationBoard.tsx` +5/−9, `Stage.tsx`
  +5/−6, `shell.css` +5/−9, `moments.css` −8, `contracts/view.ts` −21 (the open-rounds shapes,
  now the kit's), `ui/index.ts` +2/−7; one-line changes in the CSS headers, `ArtifactTable`,
  `DirectionBar`, `Scoreboard`, `session.ts`, `app.ts`, `twoFactorRoutes.ts`.

Reused from the kit: `useFitScale`, `useDockReserve`, `OriginChatFrame`, `GameBar` `toggles`,
`DockedScreen` `onUnread`, `openRoundsPage`, `OPEN_ROUNDS_CACHE_CONTROL`, `recoveryHash`,
`recoveryLookups`. Removed: four stand-ins, the CSS of the toggle's pressed state, the lead's
phone rule, the contracts' open-rounds schema.

Tests:

- new: the kit toggle, the chat badge and hand-over, no chat button undocked
  (`FocusBar.test.tsx`); a round without an https address left out (`openRoundsRoutes.test.ts`);
  a legacy recovery code found by the second lookup (`stores.test.ts`); the recovery key's rules
  (`production.test.ts`); the installer makes the recovery key, apart from the data key;
- `pnpm verify` green: 42 files, 204 tests;
- journeys 1–6 in Chromium: 1, 2, 3, 5 and 6 passed. Journey 4 failed on the back link's new
  name; after the fix it passed alone;
- the installer harness in the Linux image: 52 passed. On Windows its three 0600 file-mode checks
  fail, as before, since Windows has no such modes.

Noticed, left alone:

- a folder `https:/example.org/cases.git/.git` in the repository root, made on 2026-11-21 at
  23:45 by the installer harness's fake clone on Windows. It is empty, so git does not list it;
- the HANDBOOK deviations, listed in HANDOVER.

## Night chain SC-N4 (2026-11-22)

The owner's decisions of 2026-11-22: the three picture decisions and WebKit, the show rules
(no bots in real shows, unclaimed cases, the early-end question), the security items, `e2e` as
a required check, the applause button, a third review, the play-through. Branch
`proto/cases-v1`, continued; nothing merged.

### Final report

All seven pieces are done and pushed on `proto/cases-v1`; nothing is merged. Version
`1.0.0-rc.2`.

- **Decided and built** (D27–D39):
  - the gem turns only in the centre case and the ceremony;
  - the logo per theme;
  - the phone menu wraps;
  - no bots in real shows; unclaimed cases and "not won";
  - "End show" asks before an early end;
  - recovery codes re-issued with the password and a code;
  - the name rule and a registration that answers alike for every e-mail;
  - 60 a minute per address for claims and sign-ins;
  - the installer asks for the trusted range;
  - `e2e` is a required check of master;
  - the applause button.
- **Third review:** one high finding fixed: a socket message without its ack stopped the server.
  Three low ones fixed. One medium (registration's side channel) is for the owner.
- **WebKit:**
  - phone journeys 1–4 pass on this machine;
  - the stage's costly repaint (the turning gem in the scoreboard, the spotlight) is gone;
  - journey 4 runs on the test-only plain cookie.
- **Not done:** the six-project browser matrix stopped at 19 of 36 on this machine (BACKLOG 40).
  - Firefox failed every journey there; it passed this morning, so it is a regression or this
    machine's load.
  - Chromium at phone size failed journeys 1, 2 and 6, for the reasons in BACKLOG 40.
  - BACKLOG 12's closing text claimed more than was run and is corrected.
- **Checks of the last piece:** locally format, lint and typecheck green, 195 of 198 tests
  (three timed out on the loaded machine, none failed an assertion); CI 45105210079 green with
  every test and the Chromium journeys.
- **Committed too early:** piece 6 (`b02925b`) went in before its checks finished. Its CI was
  red on the lint; the follow-up `f3ae123` is green. No commit was amended.
- **Running for the owner:** the server at 127.0.0.1:3970 (`1.0.0-rc.2`, PostgreSQL), the
  client at http://localhost:5470 (phone: http://192.168.0.66:5470), Mailpit at
  http://localhost:8570. Quick Test seed `sc-n1-01` in the admin area.
- **To look at:**
  - the pictures in `.local/screens/proto-v4/`;
  - the not-won ceremony (a show nobody claimed);
  - the early-end question, on the PC and in the phone's panel;
  - "Applaud" in the game bar;
  - the admin area's "New recovery codes".

### Pieces

| Piece | What                                                                    | State | Commit                         | CI run                                              |
| ----- | ----------------------------------------------------------------------- | ----- | ------------------------------ | --------------------------------------------------- |
| 1     | Gem, logo, phone menu, the WebKit causes, journey 4                     | done  | `0b2c8ef`                      | 45078180392 green                                   |
| 2     | No bots in real shows, unclaimed cases, early-end question              | done  | `95ab963`                      | 45088460771 green (e2e: 6 passed in 36.6 s)         |
| 3     | Security items (recovery codes, names, registration, limits, installer) | done  | `2b379cb`                      | 45089168263 green                                   |
| 4     | `e2e` as a required check                                               | done  | `39fd2b8`                      | 45089674958 green                                   |
| 5     | The applause button                                                     | done  | `db03755`                      | 45092747536 green                                   |
| 6     | Third independent review, 1.0.0-rc.2                                    | done  | `b02925b`, follow-up `f3ae123` | 45095876865 red (lint), follow-up 45096702130 green |
| 7     | Play-through, pictures, hand-over                                       | done  | `9c1fe35`                      | 45105210079 green (all five jobs)                   |

### Needs the owner's word (SC-N4)

- **Registration's side channel** (third review, finding 2): an e-mail confirmation before an
  account exists, or the side channel as built (the owner's piece 3 text: "a new one the usual
  flow").
- **Names without a letter** (`---` passes); **applause** per socket, per account or per
  address, and whether guests may applaud; the **address budget** of 60 a minute shared by
  claims and sign-ins (a room behind one address).

- **The kit:** `v0.10.1` exists (tagged 2026-11-22 11:56); the pin stays `v0.8.0`, as CLAUDE.md
  changes the kit only on the owner's word and this chain names the kit's items as not tonight.
  `v0.10.1` renames every data attribute the kit uses to `data-sk-…` (its CHANGELOG).

### Piece 1 report

- **Gem (D27):** it turns only inside the centre case and the ceremony (`artifact.css`); the
  scoreboard, the opening and the result hold it still; reduced motion stops it everywhere.
- **Logo (D28):** `BrandLogo` (new, 37 lines) shows the full logo in light theme and the emblem
  in dark, switched by CSS on the kit's `data-theme` as the website's FormLogo and forms.css do;
  on the start page and the start card. The sign-in card sits on the start page under that logo
  and has none of its own, so it shows the same switch; no logo was added inside the card (the
  smallest reading). `assets/brand/emblem.webp` copied unchanged from the website (`c15b6de`,
  sha256 in `assets/README.md`).
- **Phone menu (D29):** the links wrap, nothing scrolls sideways. Measured: at 360 px the content
  is 328 px wide, the links need 305 px, the account 184 px, the title 136 px, so links and
  account cannot share a row; below 480 px the account stays at the right under the theme
  toggle and the links take a row of their own (one line from 360 to 480 px). The header's
  height is measured (`useShellHeight`, new, 36 lines) and published as `--shell-height`: 153 px
  at 360–480, 149 px at 520 (two link lines beside the account), 105 at 640; at 800 px the
  desktop header wraps to 113 px, which the fixed 64 px used to miss. No sideways overflow at
  any width. In focus mode the header is unmounted and the property goes, so the game bar's 44
  and 52 px apply.
- **Spotlight:** promoted once (`will-change: opacity`) and not drawn with the lights up
  (`visibility`, flipped after the fade). Measured before: the stage at 0.7 frames a second in
  Playwright's WebKit with the spotlight, 49 without it. After the gem and the spotlight,
  journeys 1–3 no longer stall: each click waits 0.5–7 s for still frames and finishes; the
  WebKit projects get 240 s per journey (Chromium keeps 90).
- **Journey 4 on plain http:** `SC_TEST_PLAIN_COOKIE=1` drops the cookie's Secure flag and is
  accepted only with `NODE_ENV=test`; production, development and an unset NODE_ENV refuse to
  start (`production.test.ts`); the cookie without Secure is proved in `websiteRoutes.test.ts`.
  The production guard is untouched. The journey opens the phone's folded chat to see it and
  folds it again; "End show" goes through `direct`.
- **Found on the way:** the admin's setup form remounted when the settings' defaults arrived
  and lost what was typed; Firefox under load lost journey 1's "12" to the default 24 that way.
  The form now waits for the defaults ("Loading the settings…", `Admin.test.tsx`).
- **Browsers:** three projects added (`chromium-mobile` Pixel 7, `firefox-mobile` 390 × 844,
  `webkit` desktop); the nightly runs all five non-Chromium-desktop projects. WebKit at phone
  size: journeys 1, 2, 3 and 4 passed. Chromium 1–6 passed. A first full run of all six
  projects was stopped: the machine was loaded (other projects' servers and my own unit tests)
  and edits reloaded into the running pages; Firefox stalled inside clicks for 90 s. The full
  run follows at the end of piece 2 with nothing alongside.
- **Lines** (before → after): `artifact.css` 102 → 109, `stage.css` 201 → 213, `shell.css`
  284 → 298, `screens.css` 288 → 295, `StartPage.tsx` 134 → 133, `ShellBar.tsx` 70 → 76,
  `Admin.tsx` 145 → 165, `config.ts` 207 → 221, `app.ts` 239 → 242, `playwright.config.ts` 82 →
  105; new: `BrandLogo.tsx`, `useShellHeight.ts`, `Admin.test.tsx`.
- **Reused:** the kit's `data-theme` and `ThemeToggle`, `usePanels` (Escape from the follow-up),
  the website's FormLogo pattern, `EnvReader.note`. **Removed:** the phone nav's hidden scroll
  row. **Noticed, left alone:** the desktop header wraps at tablet widths (now measured, not
  redesigned).
- **Test data:** two development accounts made by the menu measurement were deleted from the
  development database; the throwaway measuring script is gone.
- **Piece 2 landed early in this commit:** the admin page offers "Fill with bots" in
  development only (it shares `Admin.tsx` with the setup-form fix).
- `pnpm verify` green (39 files, 176 tests).

### Piece 2 report

- **Unclaimed cases (D34):** the domain already sealed every case and kept a case without a claim
  ownerless; new tests prove it through every step (`unclaimed.test.ts`: sealing, the three steps
  with no owner, the prize "found but not won", the result's winner without an owner, "all prizes
  found" counting opened prize cases, won or not). The member summary counts only owned cases, so
  a not-won prize never counts. The client says it with one pair of words from the contracts
  (`ownerText`: "Unclaimed", `winnerText`: "not won"): the case on the stage, the players panel,
  the owner step ("Case 7 · Unclaimed"), the registration board after the close, the scoreboard
  (struck through with "not won"), the ceremony, the result and the chronicle.
- **Bots (D34):** `POST /api/shows/:id/bots` answers 403 outside development; the admin page
  offers "Fill with bots" only in development (landed in piece 1's commit); the Quick Test keeps
  its bots. Sabotage probe: with the guard removed the refusal test failed (`expected 200 to be
403`), restored.
- **Early end (D33):** "End show" asks once while prizes are hidden ("2 prizes are still hidden.
  End the show now?", "End now" / "Keep playing"), the same in the phone's panel; with none hidden
  it ends at once (`EndShow.tsx`, new, 72 lines; the count from `facts.ts`, moved out of the focus
  bar so both use it).
- **Journeys:** journey 1 ends with a real show of two cases nobody claims: case 1 opens as
  "Unclaimed" and its prize is "not won" in the ceremony and the result, wherever the sealing put
  it; journeys 3 and 4 and the screens run answer the early-end question (`endEarly`).
- **Concept 1.7** (§3.2, §3.4, §3.5): 1.6 was taken by piece 1, so this piece's revision is 1.7.
  D32 (the ceremony reveals every prize) and D33, D34 recorded; no backlog item closes here (37,
  which also holds the bots, closes with the limits in piece 3).
- **Lines** (before → after): `DirectionBar.tsx` 124 → 116, `Scoreboard.tsx` 87 → 99,
  `LowerThird.tsx` 67 → 71, `Result.tsx` 110 → 116, `FocusBar.tsx` 121 → 115,
  `RegistrationBoard.tsx` 167 → 179, `stageParts.css` 217 → 230, `moments.css` 232 → 247,
  `organiserRoutes.ts` 44 → 51, `artifact.ts` 43 → 53, `journey1.spec.ts` 122 → 157,
  `helpers.ts` 98 → 112; new: `EndShow.tsx`, `facts.ts`, `showRules.test.tsx`,
  `showRules.test.ts` (server), `unclaimed.test.ts`. **Removed:** `focusFacts` in the focus bar
  (moved), every "no owner" and "nobody" string. **Reused:** the domain's ownerless cases, the
  kit's RateLimiter-free `Refusal`, `direct` for the phone path.
- **Checks:** see the piece's row; the web unit tests could not start on this machine for a time
  (jsdom took about 60 s to set up, over vitest's worker limit, while other projects' sessions ran
  servers and browser tests), so they ran in Playwright's Linux image and in CI.

### Piece 3 report

- **Recovery codes (D35):** `POST /api/me/2fa/recovery` takes the password and a current code
  from the app (its step used up, so a sign-in's code cannot be replayed), answers ten new codes
  and voids the old ones in the same store call (`TwoFactorStore.replaceRecovery`, memory and
  PostgreSQL in one transaction); the log line is `recovery-codes-reissued` with the account id.
  The admin area shows "New recovery codes" once two-factor sign-in is set up; there is no
  separate account page, and only admins have two-factor sign-in, so the card sits there (the
  smallest reading of "the account page").
- **Names (D36):** `nameAllowed` in `auth/names.ts`: NFC, then 3 to 32 of Latin letters (any
  diacritic), digits, `-`, `_`, and nothing NFKC would change; registration and the promote tool
  apply it (promote refuses an old name until it is renamed by hand: docs/CONFIG.md "Account
  names"). The contracts keep only the shape (trimmed, NFC, at most 64) and the sentence.
- **Registration (D36):** `registerRoute.ts` (new, 119 lines, out of `localRoutes.ts`): a new
  and a taken e-mail get the same `{ ok: true }`, no cookie, no sooner than 1 s, the password
  hashed on both paths; the mail says "your account is ready" or "there already is an account"
  with the way to sign in or reset. A taken name still answers 409: names are public on every
  board. The client says "A mail to this address tells you how to go on; then sign in"; journey
  5 reads the ready mail, signs in by name, and deletes both mails at the end.
- **Address budget (D37):** `addressLimit.ts` (new): 60 a minute per address (IPv6 /64) for
  claims and sign-ins together, one per server, checked after each route's own limits; test: four
  players from one address pass their own 20 but the 61st claim is refused with "too many
  requests from your network, wait a minute", and a sign-in after it too.
- **Installer (D37):** the Caddy profile's question says the range is trusted to name the
  visitor (default 172.16.0.0/12), the answer is remembered and named in `cases.caddy`; harness
  50 passed (5 new), run in `ubuntu:24.04`.
- **Lines** (before → after): `localRoutes.ts` 199 → 165, `twoFactorRoutes.ts` 88 → 133,
  `twoFactorStore.ts` 97 → 118, `names.ts` 26 → 38, `AccountEntry.tsx` 230 → 245,
  `accounts.ts` (contracts) 114 → 121, `app.ts` 242 → 247, `journey5.spec.ts` 97 → 113;
  new: `registerRoute.ts`, `addressLimit.ts`, `RecoveryReissue.tsx`. **Extracted:**
  registration out of `localRoutes.ts`; `RecoveryCodeList` exported from `TwoFactorSetup.tsx`
  for both cards. **Reused:** the kit's `RateLimiter`, `matchingStep`, `newRecoveryCodes`,
  `recoveryHash`; `passwordMatches`, `addressKey`. **Removed:** `ACCOUNT_NAME` (contracts), the
  register's sign-in.
- **Checks:** lint, typecheck; server 16 files, 81 tests; domain 40, application 10, contracts
  5; web 12 files, 46 tests (in Playwright's Linux image: on this machine jsdom took over
  vitest's 60 s worker limit while other projects' sessions ran); the local Chromium journeys
  ran at a sixth of their speed (2, 5, 6 passed, 1, 3, 4 hit the 90 s limit), so CI's e2e job is
  the record (piece 2's: 6 passed in 36.6 s).

### Piece 4 report

- Read master's protection with GET: required checks `verify`, `security`, `docs` (strict, app
  15368), a pull request with 0 approvals, admins included, no force push, no deletion, no linear
  history, no signatures. PUT the same with `e2e` added to the checks; the answer: checks
  `verify`, `security`, `docs`, `e2e`, strict, admins included, 0 approvals, force pushes and
  deletions off. Nothing else changed.
- The protection line is in CONTRIBUTING.md (the README has none); it names the four checks now.
  BACKLOG 22 closed, DECISIONS D38, HANDOVER's repository line.
- Docs only: the format check.

### Piece 5 report

- **Server:** `applause.ts` (new): `show:applaud` from a socket that watches the live show, at
  most 5 a second per socket (the kit's RateLimiter); per show the total and the last 10 s;
  `show:applause` to the show's watchers at once, then no sooner than 500 ms after the last
  (fake-timer tests for the limit, the cadence and the 10 s window; a socket test: a guest who
  watches is heard by another watcher, and the show's model is the same object afterwards: no
  event, no state). In memory only; a restart starts at 0. "In the public view" read as: to every
  watcher, as a message of its own beside the projection, so the domain's projections stay
  free of it (the smallest change).
- **Client:** "Applaud" in the game bar's lead beside Sound (`BarPress`, a pending piece beside
  `BarToggle` under BACKLOG 36, sharing its look and CSS), on a phone and a desktop while the
  show is live; the stage shows "Applause N" once someone clapped; the confetti on the main
  prize and in the ceremony has 1, 1.5 or 2 times its pieces for fewer than 5, fewer than 20 or
  from 20 claps in the last 10 s, back to the first step 10 s after the last count
  (`stage/applause.ts`, tests).
- **Concept 1.8** (§12 P3), DECISIONS D39, BACKLOG 10 narrowed to tips and suggestions.
- **Lint splits:** `useEscapeCloses` out of `FocusBar`, `applauseOf` out of `attachRealtime`,
  `stageStyle` out of `Stage` (each over 60 lines with the applause).
- **Lines:** `realtime.ts` 248 → 276, `FocusBar.tsx` 115 → 127, `Stage.tsx` 151 → 190,
  `feed.ts` 132 → 140, `LowerThird.tsx` 71 → 76, `stageParts.css` 230 → 241; new:
  `applause.ts` (server, 95), `applause.ts` (client), `BarPress.tsx`, both tests.
- **Checks:** typecheck, lint; server applause, realtime and security tests 12 passed; ui 5 and
  web 50 tests in Playwright's Linux image (the local jsdom workers still timed out at times).

### Piece 6 report

- **Review:** a fresh agent, read-only, over `cc75504..db03755` and the auth, limiter,
  registration, two-factor, realtime and route files in full (docs/security-pass.md, third
  pass). Six findings: one high, one medium, three low, one note.
- **Fixed before the push:** 1 (high: a socket message without its ack stopped the server; now
  dropped at the socket, test and sabotage probe); 3 (the name rule narrowed to the Latin letter
  blocks with diacritics; seven look-alikes in the test); 4 (a re-issue ends the other
  sessions); 5 (a lost race answers 409, at most 3 mails an hour per address).
- **Not fixed, for the owner:** 2 (registration's side channel: the owner's piece 3 text asked
  that a new e-mail take the usual flow, which makes the account at once; closing it needs an
  e-mail confirmation first). 6 is a note (cosmetic, bounded).
- **Scans:** `pnpm audit --prod` clean; osv-scanner with CI's pinned v2.7.0 image, 467 packages,
  no issues (a local v2.2.4 read only 15 packages from the lockfile, so CI's image is the
  record); gitleaks over the full history, 38 commits, no leaks.
- **Release:** every `package.json` at `1.0.0-rc.2`; CHANGELOG, RELEASING, README, OPEN and the
  concept's P4 row name it.
- **Committed too early:** `b02925b` went in while its lint and the server tests were still
  running (they ran side by side); its CI run failed on the lint (`attachRealtime` 66 lines).
  The follow-up `f3ae123` split it, froze the clock in the address-budget test (the budget refills
  one a second, so a slow run let a 61st claim through) and gave the Argon2-heavy two-factor
  tests 40 s; its CI run is green. No commit was amended.
- **Found on the way:** the shell tool turns a doubled backslash into one even inside a quoted
  heredoc, which mangled escapes in tonight's Python edits; the name rule's escapes were written
  with `chr(92)` and checked byte by byte.

### Piece 7 report

- **Play-through:** the Quick Test with seed `sc-n1-01` (Begin, the three steps on the main
  prize, the early-end question, the ceremony, the result) and a real show of six cases nobody
  claimed (Begin, the early-end question, the ceremony with every prize "not won") in the
  screens run; journey 1's unclaimed show; journey 6 extended by the recovery-code re-issue in
  the admin area (password and a code; ten new codes, the old ones void).
- **Pictures** in `.local/screens/proto-v4/` (proto-v3 deleted): start, sign-in, opening,
  selected, open, owner, the early-end question, the result, the ceremony with a not-won prize,
  the admin's settings, at 1536 × 768, 1280 × 720 and 390 × 844 in light and dark, and the
  phone's direction panel: 62 pictures, every one looked at; the measurements found no text
  under 14 px and no sideways overflow.
- **Fixed from the pictures:**
  - the header kept the height of the last phone size on a desktop (108 and 153 px for one
    row): its own floor was `--shell-height`, which piece 1 made its measured height; the floor
    is 64 px now;
  - the ceremony's pictures showed only its end: the run outlasted the 2.5 s per prize, so the
    page's clock is held (Playwright's `clock`) and the pictures show the first prize with "not
    won";
  - "ResizeObserver loop completed with undelivered notifications" in the console: the header's
    height is published on the next frame.
- **Left, listed:** on a phone the case tokens shorten "Unclaimed" to "Unclaim…", as they
  shorten long names; after an early end the scoreboard does not mark the prizes of unopened
  cases "not won" (the ceremony and the result do); at 1280 × 720 the early-end question takes
  a second row of the bar.

## Night chain SC-N3 (2026-11-21)

Toward production: fixes, production run, member summary, installer, sound, browser polish, a
full security review, release readiness. Branch `proto/cases-v1`, continued; nothing merged.

### Final report

**Done:** pieces 1–5, 7 and 8 in full; piece 6 run and reported but not fixed, by the budget
rule (the session's usage limit was near). Branch `proto/cases-v1`, nothing merged, every piece
pushed; CI green on every code commit except one docs commit (`0336ab8`), whose red `deploy` job
was a flaky installer check, fixed at its cause in piece 7.

- **1** prize names through one helper; look-alike names refused; 49 233 common passwords;
  `pnpm sc admin reset-2fa`.
- **2** the production run: `pnpm build`, `pnpm start` (one process with the built client), every
  setting checked in one place ([CONFIG.md](CONFIG.md)), `/api/health`, `/api/ready`, JSON logs,
  a graceful stop.
- **3** the member summary for the website's profile.
- **4** the installer, `sudo ./deploy/install.sh`, both modes, `--update`, `--check`, an answers
  file; nginx and Caddy route files checked before a reload ([INSTALL.md](INSTALL.md)).
- **5** synthesised sound, off until a viewer turns it on.
- **6** Firefox passes the journeys; WebKit's four failures (phone layout paths in the journeys, a
  `Secure` cookie on the plain-http stand-in) are BACKLOG 12, not fixed.
- **7** the second independent security review: eight findings, seven fixed; audit, osv-scanner
  and gitleaks clean; release candidate `1.0.0-rc.1` (CHANGELOG, RELEASING, CONCEPT 1.5).
- **8** the play-through (journeys, pictures, the production build, the standalone path) and
  three layout fixes it showed.

**Checks at the end:** `pnpm verify` green (34 files, 164 tests); journeys 1–6 in Chromium
passed; the installer harness 45 of 45 and shellcheck clean; 54 pictures plus the phone's
direction panel in `.local/screens/proto-v3/`, no text under 14 px, no sideways overflow.

**What runs now** (hidden, in the background, this branch): PostgreSQL 127.0.0.1:5570 and Mailpit
(http://localhost:8570); the server 127.0.0.1:3970 on PostgreSQL (`1.0.0-rc.1`); the client
http://localhost:5470 (phone: http://192.168.0.66:5470). Quick Test seed: `sc-n1-01`. The
development database holds three accounts this chain did not make ("Plan-Claude", "Walter",
"walter"); they were left as they are.

**Needs the owner's word** (HANDOVER): the merge and the tag (docs/RELEASING.md); the standing
rules of this night (the ceremony reveals every prize; motion 0.8 s, 1.6 s, 2.5 s per winner;
website rank and badges); BACKLOG 29, 30 (2FA enrolment, look-alike scripts), 35 (the feed behind
the site's Caddy), 37 (the limits' numbers, bots in real shows, the Caddy profile's trusted range),
22 (`e2e` as a required check), 27 and 33 (the website's side); every choice under "Choices made
without the owner".

### Pieces

| Piece                                      | Done                             | Running                                           | Open                 | Needs the owner's word  | Commits                                | CI run ids                                                                     |
| ------------------------------------------ | -------------------------------- | ------------------------------------------------- | -------------------- | ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| 1 Small fixes, remaining security findings | all                              | —                                                 | —                    | BACKLOG 29, 30          | `06eafb6`                              | CI 44953788972 green                                                           |
| 2 Production run                           | all                              | —                                                 | —                    | —                       | `eeab324`                              | CI 44956967985 green                                                           |
| 3 Member summary                           | all                              | —                                                 | BACKLOG 33 (website) | —                       | `40d6bb3`                              | CI 44957568796 green                                                           |
| 4 Installer                                | all                              | —                                                 | BACKLOG 34, 35       | —                       | `8d6b838`, `be9764c` (executable bits) | CI 44959614661 green (`be9764c`; `8d6b838` cancelled by it)                    |
| 5 Sound                                    | all                              | —                                                 | BACKLOG 36 (kit)     | the cues' sound         | `dd90ada`                              | CI 44961529446 green                                                           |
| 6 Phone polish, Firefox and WebKit         | run and reported (budget rule 2) | —                                                 | BACKLOG 12           | —                       | `0336ab8`                              | CI 44962828625 red: the installer harness's flaky `--check` (fixed in piece 7) |
| 7 Security review, release readiness       | all                              | —                                                 | BACKLOG 35, 37       | the review's owner list | `7ec2336`, `1fb69a4`                   | CI 44963424795 and 45001842032 green                                           |
| 8 Play-through, pictures, hand-over        | all                              | server 3970 and client 5470 on PostgreSQL, hidden | —                    | see the final report    | the hand-over commit                   | `gh run list --branch proto/cases-v1`                                          |

### Piece 1 report

- **Kit:** v0.8.0 is still the newest tag, so the pin stays (standing rule). The kit has no new
  piece, so `packages/ui/src/pending/` stays as it is.
- **Prize names:** one helper, `prizeName(slot, label)` in `packages/contracts/src/artifact.ts`:
  "Prize 2" without a label, "Prize 1 · Gold" with one (a label that only repeats "Prize n"
  counts as none). `prizeTitle(slot)` is it for a prize slot. Used by the lower third of the
  ceremony ("Prize 2 · case 4", was "Prize 2: Prize 2, case 4"), the centre case, the scoreboard,
  the artifact table, the opening, the result, the chronicle and "My matches". The result's
  `label` is the organiser's label as given ('' when none); `prizeLabel` is gone (no caller
  left). The scoreboard, the table and the opening said "Prize 1: Gold"; all say "Prize 1 · Gold"
  now.
- **Look-alike names:** `apps/server/src/auth/names.ts` `nameKey`: NFKC, case folding (upper then
  lower, so "ß" meets "SS"), no diacritics, no whitespace; tested. Registration and the promote
  tool use it in place of `trim().toLowerCase()` (in `auth/credentials.ts` until now). Local
  accounts cannot be renamed yet, so there is no rename to cover.
- **Common passwords:** `@zxcvbn-ts/language-common` 4.2.0 (MIT, 49 233 entries, installs cleanly,
  pinned exactly) beside Mini Games' ten; a test refuses a dictionary password.
- **`pnpm sc admin reset-2fa <name>`** (and `pnpm dev:sc …`): `tools/adminCommands.ts` holds both
  commands on the store ports (tested on memory stores; the PostgreSQL `remove` in the store
  test); `tools/sc.ts` is the command line only. `TwoFactorStore.remove` is new. README has a
  section "Accounts and admins".
- **docs/security-pass.md:** finding 11 fixed; a status section for the owner's list.
- `pnpm verify` green (29 files, 145 tests); journeys 1–6 passed.
- **Dependencies:** `@zxcvbn-ts/language-common` 4.2.0 (the common-password dictionary).

### Piece 2 report

- **`pnpm build`** builds the client with Vite (base path from `SC_MODE`) and typechecks the
  server. **`pnpm start`** (`apps/server/src/start.ts`: `NODE_ENV` defaults to `production`) runs
  one Node process for the API, the sockets, `/api/health`, `/api/ready` and the built client.
  The server keeps running its TypeScript through `tsx`, as in development (smallest option: no
  second build of the server; `tsx` is a runtime dependency already). At runtime only Node and
  PostgreSQL are needed.
- **The built client** (`web.ts` `serveClient`, `@fastify/static`) under the base path: hashed
  assets cached for a year, the page never; any other GET under the base path that is not the API
  answers the page (client routes from a link); the API's unknown paths stay 404.
- **Headers** (`web.ts` `helmetOptions`): helmet's defaults (CSP `default-src 'self'`, no inline
  script; the built page has none), `frame-src 'self'` plus the chat's origin in local
  development, `connect-src 'self'`, `Referrer-Policy: strict-origin` (GAME-INTEGRATION §5).
  Secure cookies and `trustProxy` from the config as before; the dev routes stay off in
  production (the guard is unchanged).
- **Config** (`config.ts`, `configRead.ts`): every variable read in one place; one message names
  every missing or malformed value and the mode that needs it. Production requires
  `DATABASE_URL`, `SC_DATA_KEY`, `SC_COOKIE_SECRET` (32 characters at least) and, in local mode,
  `SC_PUBLIC_ORIGIN`; the feed's two values go together; ports, origins, postgres URL and the
  key are checked for their form. New: `SC_LOG_LEVEL`, `SC_CLIENT_DIR`.
- **Health** (`healthRoutes.ts`): `{ ok, mode, version, db }`, `db` `ok`/`down` by a two-second
  query, `none` without a database; `/api/ready` 503 while the database does not answer.
- **Logs:** one JSON line per event on stdout (Fastify's pino); a request by method and path
  only, never its query (a reset token), headers or cookies; request lines in production only.
  **Shutdown:** SIGTERM or SIGINT closes the server and the sockets, lets database writes finish
  and ends the pool; after 10 s the process exits anyway.
- **Docs:** `docs/CONFIG.md` (every variable, default, mode, source), README "Run it in
  production".
- **Tests:** `production.test.ts` (production's required values in one message, six malformed
  values at once, website mode and the feed pair, health and ready with the database up and
  down, the built client under `/` and `/games/cases/` with its caching, client routes and API
  404s, on a free port). The real build was booted by hand against the development database on
  port 3961: health `db: ok`, the page with its headers, `/chronicle`, a 404 for an unknown API
  path and for the dev sign-in, JSON log lines without queries.
- `pnpm verify` green (30 files, 151 tests); journeys 1–6 passed.
- **Dependencies:** `@fastify/static` 10.1.12 (the built client).

### Piece 3 report

- **`GET /api/website/member-summary?user=<website user id>`** (`memberSummaryRoutes.ts`),
  GAME-INTEGRATION §7 and the website's `server/test/helpers/fakeGame.js`: under the base path
  (`/games/cases/api/website/member-summary`), `X-Games-Sync-Token` compared in constant time
  (the kit's `secretMatches`), 401 without it; 404 for a request that carries `X-Forwarded-For`
  (it came through a proxy, never the website's own call; the installer's route file also denies
  the path, piece 4); 404 for an unknown member; `{ "noData": true }` for a member without a
  show; otherwise `{ values: [Played, Prizes, Main prizes], lastPlayedAt }`, counted from ended
  shows only, whose content is public; `Cache-Control: no-store`. Registered only in website
  mode with the feed's token (the same token, §7).
- **Tests** (`memberSummaryRoutes.test.ts`): the token and the proxy guard, unknown and no data,
  a real card checked against the public result and the contract's limits (1–4 values, labels of
  at most 24 characters, at most 4096 bytes, an ISO time), no route without the token or in local
  mode.
- **The website's side:** `GAMES_LOCAL_ORIGINS` needs `cases=<origin>` once the game runs on the
  server; the website's installer does not wire it yet (§7). BACKLOG 33.
- **Noticed, left alone:** the kit repository got a commit tonight (`21e82eb`, "the second
  independent review's findings"); no new tag, so the pin stays (the standing rule checks at the
  chain's start). The website's GAME-INTEGRATION §6 now lists `cases` among the embedded slugs.
- `pnpm verify` green (31 files, 155 tests).

### Piece 4 report

- **Pattern:** Mini Games' installer (`ops/install.sh`) runs Docker; the questions, the remembered
  answers, the secrets kept once, `put_file`, the route files and their check-and-restore follow
  it. Node, pnpm, the system user and systemd have no game precedent; Node comes from NodeSource's
  signed apt repository, the way the website's installer adds Docker.
- **`deploy/install.sh`** (one call from a clone): asks the mode, port, code (repository and
  ref), database (`create`: a local PostgreSQL role and database, the password generated and kept
  in the environment file only; or a URL), and per mode the public origin, proxies and SMTP
  (local) or the website's origin, its proxy (`nginx` found by itself when its routes folder
  exists), the routes folder, the site port file and the bridge address (website). Remembered in
  `/etc/seasonal-cases/install.conf` (0600, no secrets); settings and secrets in `cases.env`
  (0600, read by systemd); `--answers FILE`, `--yes`, `--update` (new `--ref`, the rest
  remembered), `--check` (says each file it would write, changes nothing). A re-run with the same
  answers changes nothing.
- **`deploy/lib/`:** `common.sh` (questions, files, secrets; every path under `SC_ROOT` for the
  tests), `host.sh` (Debian/Ubuntu check, packages, Node 22, corepack, PostgreSQL), `app.sh`
  (user, code, build, settings, the hardened systemd unit `seasonal-cases`, readiness through
  `/api/ready`), `route.sh` (the route file).
- **Website mode route file** (`cases.conf` for nginx in `/etc/seasonal/routes`, `cases.caddy`
  for the site's Caddy; 0600): `/games/cases` → `/games/cases/`; `/games/cases/api/website/`
  answers 404 publicly (the profile card is the website's alone, §7); every request has the
  identity headers and the secret cleared and the website's session cookie removed; only the sign-in
  route asks `/api/games/cases/authorize`, passes the identity on and then adds
  `X-Sc-Proxy-Secret`; `nginx -t` or `caddy validate` before the reload, the previous file back
  when the check fails. The feed stays denied by the website's own files. With the site's Caddy in
  its container the game listens on the Docker bridge (`SC_HOST`, new) and the feed is off
  (BACKLOG 35).
- **`deploy/admin.sh`:** `pnpm sc` on an installed game, the settings loaded into the process,
  never onto a command line.
- **Tests:** `deploy/test/installer.test.sh`, 41 checks in four cases (local with database and
  mail, re-run, `--check`, `--update`; nginx with a refused check restoring the route; Caddy;
  refusals and an answers file), stub commands on PATH under a temporary root; shellcheck 0.10.0
  through the entry points (it follows the libraries). CI job `deploy` runs both. Locally both
  ran in Docker (`ubuntu:24.04`, `koalaman/shellcheck:v0.10.0`).
- **Server:** `SC_HOST` (IPv4, default 127.0.0.1) in `config.ts`, `main.ts`, docs/CONFIG.md; the
  config test names a malformed one.
- **Docs:** docs/INSTALL.md (step by step, for a terminal such as Termius), README "Install on a
  server", `deploy/answers.example`.
- **Found on the way:** Python's text mode on Windows had written two scripts with CRLF; they are
  LF now (`.gitattributes` normalises on commit anyway).
- `pnpm verify` green (31 files, 155 tests).

### Piece 5 report

- **`apps/web/src/stage/sound.ts`** (Web Audio only, every cue synthesised from oscillators and
  filtered noise, no files): `cuesFor(prev, next)` maps the same view changes the motion follows:
  the opening begins (a rising tone and the ticks of the cases rolling in; the opening has no
  countdown, so the ticks go with the roll-in), a case is selected (a swelling soft drum-roll over
  the travel), a case opens (a chime on a prize; a fanfare and a cheer-like noise burst on the
  main prize; nothing on a blank), the show ends (applause for the ceremony). The noise uses a
  fixed integer sequence (no `Math.random`).
- **Off by default**, turned on by the viewer with the sound button in the game bar
  (`BarToggle`, pending kit item BACKLOG 36: the kit's bar actions only open panels); the choice
  is remembered per browser (localStorage `sc-sound`); a remembered "on" starts at the viewer's
  first tap, which browsers require. The hook lives in `App`, so the applause plays after the
  game bar has gone. Reduced motion does not silence it.
- **Volume:** `presentation.volume` (0–100, default 60) in the settings catalogue with its
  description and warning, copied into each show like the motion; older shows merge onto the
  defaults (`model.ts`). The admin's settings form shows it.
- **Phones:** the fourth button would have overflowed the bar again, so "prizes left" is read out
  on a phone (`desktopOnly`; the scoreboard shows the prizes) and the toggle shows its icon only.
- **Extracted:** `SettingsParts.tsx` (the settings form's fields and artifact list; the form had
  306 lines); `useCurrentShow(onStage)` lets go of a held show by itself (App had 62 lines).
- **Tests:** `sound.test.tsx` (no cue for a first view or another show; opening, drum-roll,
  fanfare, chime, nothing at Owner, applause; off until turned on, remembered).
- `pnpm verify` green (32 files, 158 tests).

### Piece 6 report

- **Budget rule 2 applied:** the session's usage limit was near, so the Firefox/WebKit fixes were
  dropped as the task orders: run, report, fix nothing.
- **Firefox:** journeys 1–6 passed (6.3 min).
- **WebKit at phone size** (`webkit-mobile`): 5 and 6 passed; 1 and 3 failed: they drive the
  direction bar under the stage, which a phone has in the game bar's "Direction" panel (by
  design, SC-N2 piece 3); the journeys need a phone path that opens the panel and closes it before
  clicking a case (the panel overlays the stage), and journey 1 measures the desktop travel. 2
  failed because it followed the show 1 left live. 4 failed because the stand-in website runs on
  plain `http://127.0.0.1` and WebKit drops the `Secure` session cookie there (Chromium and
  Firefox accept it on that address); production is https. All in BACKLOG 12.
- **Phone sizes:** 360 × 780 and 430 × 932 in light and dark are in the pictures of SC-N2 piece
  10 and of this chain's piece 8 (the game bar's panels, scoreboard, ceremony, result); the last
  run had no text under 14 px and no sideways overflow.

### Piece 7 report

- **The second independent review** (a fresh agent that had not seen the chain; the usage limit
  stopped it once, and it went on from its saved state): the whole branch against CONCEPT §8 and
  §10, CLAUDE.md, the website's AUTH.md and GAME-INTEGRATION.md; a new section in
  [security-pass.md](security-pass.md) with eight findings, three medium, none high. Fixed:
  1. the installer handed /opt/seasonal-cases to the service user, whose code root later runs:
     the code stays root's and read-only for the service;
  2. IPv6 visitors counted per address: every address limit counts by /64 (`addressKey.ts`);
  3. watching and claiming without limits, and every watch sent the show to every watcher: a
     guest's watch reaches that socket only, 10 watches in 10 s per socket, 20 claims a minute per
     player;
  4. a socket kept the role it connected with: every direction message reads the session again
     and closes the socket once it ended elsewhere;
  5. a failed event write left the show going on in memory: the server stops, systemd restarts
     it from the database;
  6. the nginx sign-in route passed the website's cookie on: stripped there too;
  7. the installer's smaller points (no database URL as a flag, a hidden prompt; the repository,
     site port, host and proxies checked).
     Left: 4 (the feed behind the site's Caddy, the website's side, BACKLOG 35); the limits'
     numbers, bots in real shows and the Caddy profile's trusted range are the owner's (BACKLOG 37).
     Tests: `securityPass2.test.ts`, `addressKey.test.ts`, four new harness checks (45 now).
- **Found on the way:** CI's `deploy` job failed once on `0336ab8`: under `--check` the database
  step piped the role's password into a command that a dry run does not start, and the pipe
  broke now and then. A check now pipes nothing there; the harness passed five runs in a row.
- **`pnpm audit --prod`, osv-scanner, gitleaks** (full history, 29 commits): clean.
- **Release readiness** (`7ec2336`): CHANGELOG.md by piece; docs/RELEASING.md (the merge, the
  annotated tag registered in TAGS.md, the server's update call); `1.0.0-rc.1` in every
  package.json, no tag; CONCEPT 1.5 with the phases' status (the task named "v1.2", but the concept
  was at 1.4 already, so this revision is 1.5); README current.
- `pnpm verify` green (34 files, 164 tests); journeys 1–6 passed in Chromium.

### Follow-up (2026-11-22): the WebKit phone path and the rest of the pictures

- **WebKit at phone size:** the journeys now direct a phone show through the game bar's panel
  (`e2e/helpers.ts` `direct`: open the panel, act, close it with Escape). Escape did not close
  the panels at all: the kit's `usePanels` leaves the key to the game, and the focus bar now
  closes the open panel from anywhere on the page (`FocusBar.test.tsx`), as Mini Games does.
  Journeys 1 and 3 still stall in WebKit, on Windows and in Playwright's Linux image alike:
  Playwright waits for two still frames before each click, and its WebKit sometimes drew the
  stage at under one frame a second. Measured: the scoreboard's main-prize gem turns endlessly
  and repaints the page every frame; the spotlight (a full-stage gradient under a `clip-path`) is
  costly to repaint; reduced motion alone did not cure it (tried, reverted). BACKLOG 12 holds the
  measurements and the next step; whether the gem turns outside the centre and the ceremony
  needs the owner's word.
- **Pictures:** all 54 looked at after a fresh run. Fixed:
  - the game bar touched both screen edges (the kit's bar has no inline padding): it keeps the
    stage's gutter now, 0.5rem on a phone;
  - the result's first row of prize cards lost the top of its ring (the kit's reveal box scrolls
    and clips): 2 px of room;
  - the start card read "0 owners" while cases were taken: during registration it counts the
    picked cases ("4 picked"), after the close the owners (`startCard.test.ts`);
  - the main prize's gem kept turning under reduced motion: it holds still there now.
- **Left for the owner:** the logo's dark lettering vanishes in dark mode (BACKLOG 38); the
  phone's menu row ends mid-word (BACKLOG 39).
- **A test that timed out under load:** the PostgreSQL store test's setup ran every migration in
  over 10 s during a full `pnpm verify` (about 5 s alone): its hook has 30 s now.

### Piece 8 report

- **Play-through:** the six journeys (local mode with the Quick Test, the three steps, the
  hand-over, the ceremony and the result; website mode; the standalone path: register, the
  forgotten password through Mailpit, two-factor sign-in with a code and a recovery code); on the
  dev stack by hand: registration, the reset mail in Mailpit, `pnpm dev:sc admin promote`; the
  production build booted once on port 3961 (`/api/health` `1.0.0-rc.1` with `db: ok`, the page,
  `/api/ready`).
- **Pictures** in `.local/screens/proto-v3/` (proto-v2 deleted): sign-in, start, opening,
  selected, open, owner, ceremony, result and the admin's settings at 1536 × 768, 1280 × 720 and
  390 × 844, light and dark, and the phone's direction panel. Looked at: 18 of the 56 (each screen
  at least once, every fixed one again); the other 38 passed the measurements (no text under
  14 px, no sideways overflow), not looked at one by one.
- **Fixed from the pictures:**
  - the ceremony on a phone was cut off (absolute in a stage as tall as its rows): in the
    phone's column now, as the opening;
  - the settings' labels stood glued to their inputs and the confetti box above its word: the
    settings' labels are columns, the checkboxes rows;
  - the sign-in card had an empty band under its heading: the card is a column that does not
    wrap (a wrapping column sized the form at a width where its button wraps and kept that
    height; measured in the browser: 127 px, 67 after).
- **Left:** the WebKit findings (BACKLOG 12); nothing seen in the pictures is left open.
- **Test data:** the account and mail of the hand check were removed one by one; the development
  database was not reset, as it holds three accounts this chain did not make.
- **Servers:** the dev server and client of SC-N2 were stopped and `pnpm dev` started again on
  this branch.
- `pnpm verify` green (34 files, 164 tests); journeys 1–6 passed in Chromium.

## Night chain SC-N2 (2026-11-21)

Kit v0.8.0, three steps, scoreboard, the moving case, start and finale, website mode with the
chat, standalone accounts with 2FA, settings, chronicle. Branch `proto/cases-v1`, continued;
nothing merged.

### Final report

**Done.** All ten pieces, on `proto/cases-v1`, nothing merged, nothing dropped from the budget
list (the chronicle, the season tint and phone polish, the forgotten-password mail and the
ceremony's animation were all built). Every piece was pushed; every CI run is green (the pieces
table).

- Pieces 1–3: kit v0.8.0, the click and three steps, the scoreboard, the moving case, the start
  page, the opening with Begin, focus mode, the ceremony and the result frame.
- Piece 4: website mode with the website's sign-in, rights, rank and badges, the account feed,
  the docked chat, everything under `/games/cases/`.
- Pieces 5–7: PostgreSQL (accounts, sessions, the event log with the sealed secret encrypted),
  standalone accounts (register, sign in by name or e-mail, forgotten password by mail, roles and
  ranks, lobby, "My matches"), 2FA for standalone admins, then an independent security review
  ([security-pass.md](security-pass.md)): 13 findings, 12 fixed with tests, one for the owner.
- Pieces 8–9: the settings catalogue in the admin area (new shows copy it), the season tint, the
  polish from the pictures, the chronicle.
- Piece 10: the play-through through the pictures and journeys; it found and fixed the ceremony
  that a show in registration hid, the opening cut off on phones, the scoreboard eating a phone's
  stage, cut artifact names on the result, and the header overflowing phones.

**Extra:** the open-rounds listing for the website (BACKLOG 25), the first item without the
owner's word, as the task allows when time is left.

**Checks at the end:** `pnpm verify` green (27 files, 142 tests); journeys 1–6 passed in
Chromium; 160 pictures (8 screens × 10 sizes × 2 themes) plus the phone's direction panel in
`.local/screens/proto-v2/`, no text under 14 px, no sideways overflow; `proto-v1` deleted.

**What runs now** (hidden, in the background): PostgreSQL 127.0.0.1:5570 and Mailpit (web
http://localhost:8570) from `ops/compose.dev.yml`; the server 127.0.0.1:3970 on PostgreSQL; the
client http://localhost:5470 (phone on the home Wi-Fi: http://192.168.0.66:5470). The development
database is empty.

**How to play it through (development sign-in, no password):**

1. http://localhost:5470, "Development sign-in" as `Mia`, role `organiser` (or `admin`).
2. Admin: Quick Test with the seed `sc-n1-01` (24 cases, 3 prizes): a live show with bots, Mia
   holds the direction. Stage: the opening, Begin, click a case, Open, Owner, Back to stage; End
   show for the ceremony, then "See the result".
3. A second tab (private window) as a player to watch; the Chronicle lists ended shows.
4. Standalone accounts: "Create an account" on the start page; "Forgotten password" mails go to
   Mailpit (http://localhost:8570). For an admin with 2FA: `pnpm dev:sc admin promote <name>`,
   sign in again, Admin, "Set up", scan the key with an authenticator app.
5. Settings (Admin, as an admin): change names, durations or confetti; the next show uses them.

**Needs the owner's word:** see HANDOVER "Needs the owner's word": among them the security
review's questions (BACKLOG 29–31), the motion and ceremony pace, website mode's rank and badge
rules, the website's side for `cases` (BACKLOG 27), `e2e` as a required check (BACKLOG 22), and
every choice listed under "Choices made without the owner (SC-N2)" below.

### Pieces

| Piece                                                     | Done | Running                                           | Open                     | Needs the owner's word                                   | Commits                                        | CI run ids                                                                       |
| --------------------------------------------------------- | ---- | ------------------------------------------------- | ------------------------ | -------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| 1 Kit v0.8.0, fixes A and B, three steps, scoreboard      | all  | —                                                 | —                        | —                                                        | `c36b3e1`                                      | CI 44885929803 green                                                             |
| 2 The moving case                                         | all  | —                                                 | —                        | the durations (HANDOVER)                                 | `aaa6022`, report `a31fd7b`                    | `aaa6022` cancelled by the next push; `a31fd7b` (same code) CI 44886487846 green |
| 3 Start page, opening, focus mode, ceremony, result frame | all  | —                                                 | —                        | the ceremony's pace (HANDOVER)                           | `ad20ab0`                                      | CI 44887472450 green                                                             |
| 4 Website mode                                            | all  | —                                                 | BACKLOG 24–27            | the rank and badge rules; the website's side for `cases` | `3d2d783`                                      | CI 44890310077 green                                                             |
| 5 PostgreSQL and the accounts store                       | all  | —                                                 | —                        | —                                                        | `2b326a2`                                      | CI 44891199382 green                                                             |
| 6 Standalone accounts                                     | all  | —                                                 | —                        | the reset link's rules (choices list)                    | `2edcd6a`                                      | CI 44892910589 green                                                             |
| 7 2FA and the independent review                          | all  | —                                                 | security pass 11         | the security pass's owner list (HANDOVER)                | `f482024` (2FA), `49433d9` (fixes)             | CI 44893758086 and 44895315472 green                                             |
| 8 Settings, season tint, polish                           | all  | —                                                 | BACKLOG 32 (kit)         | rank source, chronicle length                            | `3d81756` (settings), `17886f4` (tint, polish) | CI 44897326662 green (`17886f4`; `3d81756` was pushed with `49433d9`)            |
| 9 Chronicle                                               | all  | —                                                 | —                        | the chronicle's length (50)                              | `17886f4`                                      | CI 44897326662 green                                                             |
| 10 Play-through, pictures, hand-over                      | all  | server 3970 and client 5470 on PostgreSQL, hidden | —                        | see the final report                                     | `1172a27`                                      | CI 44898497976 green                                                             |
| Extra: open-rounds listing (BACKLOG 25)                   | all  | —                                                 | the website's card field | —                                                        | see HANDOVER                                   | see HANDOVER                                                                     |

### Piece 1 report

- **Kit:** `v0.8.0` (commit `30ce80a`) pinned in `packages/ui` and `apps/web` (DECISIONS D18).
  Migration notes 0.5.0 → 0.8.0 that concern a game like this one: `.sk-visually-hidden` now in
  `shell.css` (imported already); the phone root height `var(--sk-visible-height)` applies once
  the screens sit in `DockedScreen` (piece 4). The kit still has no `cases` fit floors and still
  reserves the dock only with a chat, so `pending/fit-cases.css` and `pending/useDockReserve.ts`
  stay (BACKLOG 19, 20). The kit test proves `@seasonal/kit`, `@seasonal/kit/react`,
  `@seasonal/kit/server` and the CSS entries, `bar.css`, `dock.css` and `frames.css` included.
- **Fix A:** `currentShow` follows live → sealed → registration → setup → ended, newest
  first within each (`apps/server/src/showRoutes.ts`). Shows made in the same millisecond keep
  their creation order (`packages/application/src/shows.ts`). The client's `useCurrentShow`
  has a `refresh`. The admin asks for the current show after Quick Test and Create, before it
  navigates. The feed empties its views when the show id changes (`apps/web/src/lib/feed.ts`).
  Tests: `routes.test.ts` "the current show" and `lib/feed.test.tsx`.
- **Fix B:** the direction bar exists only while the show is live; after the end only "See the
  result" stays (`Stage.tsx`, test "is gone once the show has ended").
- **Three steps:**
  - `RevealStep` is `idle | selected | open | owner`; the direction's steps are `open`,
    `owner` and `return`;
  - removed from contracts, domain, server tests, stage, component tests and the journeys;
  - a logged step the show no longer knows folds as a no-op (`model.ts`, its header says so;
    test "folds a logged step the show no longer knows");
  - the found prizes count from Open;
  - the public view's `found` and `stillHidden` are gone with the top bar that read them;
    `allPrizesFound` stays.
- **The centre case at Open:** the artifact and under it "Prize 1 · Gold", "Prize 2" without a
  label, or "No prize" (`CentreStage.tsx`).
- **Scoreboard** (`stage/Scoreboard.tsx`, `stage/scoreboard.css`):
  - it replaces the top bar (`TopBar.tsx` deleted), with one row per prize, then the blank;
  - states open, lit and taken, computed only from the public view;
  - one line per row on a phone;
  - the commitment beside it;
  - test `Scoreboard.test.tsx`.
- **Base path ready:** every client API call, page link and the socket path go through
  `lib/base.ts` (Vite's base), the groundwork for website mode (piece 4).
- **Docs:** CONCEPT v1.1 (§3.4 the click and three steps, §7 the scoreboard and the meaning at
  Open, §14 without the decided steps), DECISIONS D18–D25, README.
- **Tests:** `pnpm verify` green (17 files, 89 tests before the feed test; 18 files, 91 with
  it); journeys 1–3 passed in Chromium.
- **Left alone:** the SC-N1 section below keeps the five steps as that night's record.

### Piece 2 report

- **The travel** (`stage/travel.ts`):
  - after the click the front case is drawn at the front, then placed onto its place on the
    half circle with an inverse transform (start and end rectangles measured), and a CSS
    transition takes it to the front, 0.8 s ease-in-out;
  - the case's place keeps its room but hides the case (`is-away`), so it never shows twice
    and never fades out and in;
  - after Back to stage, `useReturn` keeps the case at the front while it closes (0.3 s), then
    it travels home;
  - a new selection ends any travel at once, and a click during a motion is sent at once.
- **The slow opening** (`stage/front.css`, 1.6 s): the lid rises in the first 45 %, the glow
  grows under it, the artifact emerges from 40 %, the meaning fades in from 80 %. The artifact is
  drawn only when the view carries it.
- **One settings object** (`stage/motion.ts`): every duration, as the CSS variables
  `--travel-ms`, `--travel-ease`, `--open-ms`, `--close-ms` on the stage. Under reduced motion
  the kit's motion.css turns every transition and animation off, and `motionMs` answers 0, so
  the stage shows end states at once.
- **Removed:** the drum-roll shake at the click and the centre's fade-in (the travel replaces
  them); the front case's rules moved from `stage.css` to `front.css`.
- **Tests:** `stage/motion.test.tsx` covers:
  - the settings and their CSS variables;
  - the inverse transform;
  - the way home, with a new selection ending it;
  - no artifact while the view has none.

  Journey 1 checks that the case's box at the front differs from its box at its place (moved
  more than 20 px, wider), and that neither artifact nor meaning shows before Open. `pnpm
verify` green (19 files, 95 tests); journey 1 passed.

### Piece 3 report

- **Start page** (`screens/StartPage.tsx`, replaces `Lobby.tsx`):
  - the Seasonal Entertainment logo, copied unchanged from the website project to
    `assets/brand/logo.webp`, licence note in `assets/README.md`;
  - the kit's `StartCard` in the show's season (the public view now carries `season`), with
    the state as its badge, cases, prizes and owners as its facts, and the links to the stage
    or the result;
  - the registration board below while the show is in registration, and the dev sign-in for a
    guest.
- **Opening:**
  - a new domain event `begun` and the command `begin`: the direction holder only, once,
    after `start`; until then `select` is refused ("begin the show first");
  - contracts: `live.begun` and the socket message `direction:begin`. The server's handler
    shares the show-only schema with `direction:end` (`ShowRequestSchema`, which replaces
    `EndRequestSchema`);
  - on the stage (`stage/Opening.tsx`): title, cases and prizes, the artifact table, the cases
    rolling in; "Begin" for the holder only, no clickable case and no direction bar before it.
- **Focus mode** (`shell/FocusBar.tsx`): during a live show on the stage the kit's `GameBar`
  replaces the header (`useFocusMode`).
  - Its facts are the cases left and the prizes left. Full screen comes from `useFullscreen`.
  - Its panels (`usePanels`) are the players and, for the direction holder on a phone, the
    direction bar, which is then not under the stage. The chat panel is ready for piece 4.
  - The header moved to `shell/ShellBar.tsx`.
- **Ceremony** (`stage/Ceremony.tsx`): client-only, driven by the ended view's result. It shows
  the winners from the highest slot to slot 1, one every 2.5 s, each with its artifact and the
  lower third. Confetti comes with the main prize, then "See the result".
- **Result page** on the kit's `ResultFrame`:
  - headline "The winners";
  - the placings;
  - the proof line;
  - the reveal of every case;
  - the full list as `more`.

  Its CSS moved to `screens/result.css`; the old one-screen result layout is gone.

- **Kit, reused:** `StartCard`, `ResultFrame`, `GameBar`, `usePanels`, `useFullscreen`,
  `useFocusMode`, `useDockView`, `frames.css`, `bar.css`.
- **Tests:**
  - `stage/moments.test.tsx`: the opening (Begin for the holder only, no click before), the
    ceremony's order and sequence with faked timers, the ceremony after the end without the
    bar;
  - `App.test.tsx`: the result frame's parts;
  - domain: "the opening".
  - Journeys 1–3 click Begin. Journey 1 waits through the ceremony to the result; journey 3
    reads the commitment on the scoreboard during the opening.

  `pnpm verify` green (20 files, 100 tests); journeys 1–3 passed in Chromium.

### Piece 4 report

- **Modes** (`apps/server/src/config.ts`): `SC_MODE` `local` or `website`.
  - Website mode puts every route, the socket (`path`), the cookie and the client's paths
    (`apps/web/src/lib/base.ts`, Vite's `base`) under `/games/cases/`.
  - Website mode refuses to start without `SC_PROXY_SECRET`, `SC_WEBSITE_ORIGIN` and
    `SC_TRUSTED_PROXIES`.
  - The development features exist only in local mode.
- **Sign-in** (`websiteRoutes.ts`): `/auth/website` on the kit's `websiteSignInCheck` (steps
  'each', header `X-Sc-Proxy-Secret`); the hop `/auth/website/login` on `websiteLoginLocation`.
  - An untrusted peer gets 403, a guest the login hop, an invalid identity 403
    `NO_WEBSITE_USER`.
  - A member gets the account by (origin, user id), name, role, rank and badges brought up to
    date, a rotated 7-day session, and a redirect to `safeNext`.
  - The kit's `RateLimiter` allows 30 a minute per address.
- **Accounts and sessions** (`auth/accounts.ts`, `auth/sessions.ts`): async store ports with
  in-memory stores (PostgreSQL in piece 5).
  - The cookie holds a random token; the store keeps its sha256.
  - Sign-out and every sign-in rotate it, and an ended session closes its sockets (the kit's
    `SessionEnds`).
  - The development sign-in now makes a `dev` account and a session the same way.
  - The projections take a `people` lookup (`Directory`), so a rename shows from the next
    sign-in and a deleted account as "deleted player" plus its short id everywhere.
- **Feed** (`auth/accountFeed.ts`): every 15 s with the sync token; `locked` and `rights` end the
  sessions, `deleted` anonymises, `unlocked` does nothing; page by page, safe to repeat.
- **Rights:** the kit's `mappedRoles` gives admin → admin, may host → organiser, else player.
  The rank is the number of valid steps, at most 5; the badges are the step icons, checked
  against the contract's form on the server (kit) and again on the client (`BadgeSchema`).
- **Organiser:** the dev role `moderator` is `organiser` throughout code and tests. The
  organiser's routes moved from `/api/dev/shows…` to `/api/shows…` and work in every mode; the
  Quick Test and the development sign-in stay development routes.
- **The chat:** the kit's `DockedScreen` with `WebsiteChatFrame` room `cases`, sandboxed,
  around every screen, mounted once.
  - The call slot is reserved and hidden (`callId` null). On a phone the kit's chat bar and
    sheet are used.
  - In local mode with `SC_CHAT_ORIGIN` (dev.env: http://localhost:5380) the dock frames that
    origin through the pending `OriginChatFrame` (BACKLOG 23).
  - `BackLink` shows in website mode only. The client's CSP is `frame-src 'self'` (plus the dev
    chat origin locally).
  - The README says how to approve the game's origin in the website's Admin → Embedding.
- **Tests:**
  - `websiteRoutes.test.ts` covers untrusted, wrong secret, guest, invalid, member (base path,
    cookie path and Secure, rank, badges, rename), the role mapping, no dev routes and no root
    paths in website mode, the feed's parsing, the lock and the deletion.
  - Journey 4 runs against the stand-in website (`e2e/websiteStub.ts` on 5485, the game in
    website mode on 3990), with Vite in middleware mode under `/games/cases/`. It covers:
    - the organiser and the member signing in through the website;
    - the back link, the badge and the docked chat frame;
    - the member's pick;
    - a guest without a pick or a sign-in form;
    - the organiser beginning and ending the show.
  - `pnpm verify` green (21 files, 107 tests); journeys 1–4 passed.
- **A flaky journey fixed at its cause:** journey 4 failed about every second run at "the guest's
  stage". The guest's second socket never got socket.io's open packet. The stand-in's upgrade
  proxy dropped the bytes the game sent together with its 101 answer (the third argument of
  Node's `upgrade` event). It forwards them now, and journey 4 passed 4 of 4 in a row.
- **Dependencies:** `@seasonal/kit` (v0.8.0) for the server too; Vite 8.3.4 at the root for the
  stand-in's middleware.

### Piece 5 report

- **Services** (`ops/compose.dev.yml`, `ops/compose.dev.env`): PostgreSQL 17 on 127.0.0.1:5570
  and Mailpit (SMTP 1170, web 8570), the images pinned by digest as in Mini Games, restarting
  unless stopped. Development-only credentials.
- **Database** (`apps/server/src/db/`):
  - `pool.ts` (one schema on the search path, transactions), `migrator.ts` (each `.sql` once,
    refusing a changed one), `migrations/0001_initial.sql` (accounts with rank and badges,
    sessions by token hash, `two_factor` and `recovery_codes` for piece 7, `show_events`,
    `server_state`).
  - `accountStore.ts` (accounts, sessions), `state.ts` (the feed's cursor), `eventStore.ts`:
    the log is read once on start; each append is written behind in order through one queue,
    so the synchronous `EventStore` port and the show service stay as they were; the shows are
    still rebuilt from their events.
  - `box.ts`: AES-256-GCM with `SC_DATA_KEY`. A sealed event's assignment and secret are one
    box; only the commitment is readable in the row.
  - `open.ts` opens pool, migrations and stores; `main.ts` uses it when `DATABASE_URL` is set,
    else the JSON-lines log and memory (the browser tests keep that). `DATABASE_URL` without
    `SC_DATA_KEY` refuses to start. SIGINT and SIGTERM let pending writes finish.
- **The feed's cursor** survives a restart: `CursorStore` in `auth/accountFeed.ts`, memory or
  `server_state`.
- **`pnpm dev:reset-db`** (`src/tools/resetDevDatabase.ts`) drops and migrates the `sc` schema;
  it runs only with `NODE_ENV=development` and a database on 127.0.0.1 or localhost.
- **`dev.env`:** `DATABASE_URL`, a development-only `SC_DATA_KEY` and `SC_COOKIE_SECRET` (so a
  session survives a dev restart), the Mailpit SMTP settings for piece 6.
- **Tests** (`db/stores.test.ts`, against the real database, each run in a random schema it
  drops): migrations once; accounts by id and website, replaced; sessions by hash, ended per
  session and per account, the token nowhere in the table; the cursor; a Quick Test show
  rebuilt after a restart with its secret absent from the rows and its commitment verifying;
  the box refusing a wrong key, a changed box and a short key.
- **CI:** the `verify` job has a postgres service (same image) and `SC_TEST_DATABASE_URL`.
- **Checked by hand:** the dev server on PostgreSQL (port 3975, as an earlier server holds
  3970): dev sign-in wrote the account and session rows; the database was reset afterwards.
- `pnpm verify` green: 22 files, 113 tests.
- **Dependencies:** `pg` 8.23.1 (the PostgreSQL client, as Mini Games), `@types/pg` 8.23.1.
- **Lines:** new files `db/pool.ts` 50, `db/migrator.ts` 69, `db/box.ts` 40,
  `db/eventStore.ts` 88, `db/accountStore.ts` 115, `db/state.ts` 31, `db/open.ts` 53,
  `db/testing.ts` 29, `db/stores.test.ts` 142, `tools/resetDevDatabase.ts` 27, the migration 62.
  Changed: `main.ts` 16 → 35, `config.ts` 86 → 99, `app.ts` 146 → 152, `auth/accountFeed.ts`
  101 → 127. Nothing removed; the JSON-lines and memory stores stay for runs without a database.

### Piece 6 report

- **Accounts in local mode** (DECISIONS D24), on Mini Games' rules (its `auth/password.ts` and
  `http/routes/auth.ts`):
  - a name of 3 to 24 letters or digits (also `_ . -`), unique without regard to case; an
    e-mail, required, unique; a password of 12 to 128 characters, not one of the ten common
    ones; Argon2id at 64 MiB, 3 passes, 1 lane; a dummy hash for unknown names;
  - `apps/server/src/localRoutes.ts`: `POST /api/auth/register`, `sign-in` (name or e-mail),
    `forgot`, `reset`; the kit's `RateLimiter` at 20 per 15 minutes per address, 5 per login
    and address, 5 registrations an hour per address; one answer for a wrong name and a wrong
    password; one answer for every e-mail on `forgot`;
  - `auth/passwords.ts`, `auth/credentials.ts` (port and memory), `db/credentialStore.ts` and
    migration `0002_local_accounts.sql`;
  - website mode answers 404 on all four (not registered there).
- **Forgotten password:** a link with 32 random bytes, stored as its sha256, valid one hour,
  used once (`UPDATE … WHERE used_at IS NULL AND expires_at > now`); the reset ends every
  session of the account. Mail through nodemailer to `SC_SMTP_HOST`/`SC_SMTP_PORT` (dev:
  Mailpit 1170); the link opens `SC_PUBLIC_ORIGIN` (default the dev client 5470). Without SMTP
  the route answers 503.
- **Roles and ranks:** `pnpm sc admin promote <name>` (`src/tools/sc.ts`) makes the first admin
  on the server's database. The admin area (`/admin`, now titled "Admin") lists the accounts for
  an admin and sets role and rank (`accountRoutes.ts`, `screens/AccountsAdmin.tsx`). A website
  account is read-only, an admin cannot drop their own admin role, a role change ends the
  account's sessions.
- **Lobby and "My matches":** every show on the start page (`screens/Lobby.tsx`) with its way to
  the stage or the result; `/matches` lists the user's case per show from the public view, so a
  prize shows only once its case is open.
- **Client:** `account/AccountEntry.tsx` (sign in, create an account, forgotten password) on the
  start page for a guest in local mode, the development sign-in beside it in development;
  `account/ResetPage.tsx` (`/reset`); "My matches" in the header when signed in.
- **Tests:** `localRoutes.test.ts` (registration and its rules, sign-in by name and e-mail, the
  same answer for wrong name and password, the limits, the reset link once and its ended
  sessions, 503 without mail, 404 in website mode, the admin's roles and ranks, "My matches"
  before and after the open); the credential store against PostgreSQL; journey 5 (register, a
  refused short password, sign out, forgotten password, the mail from Mailpit's API, reset, the
  old password refused, sign-in by e-mail, "My matches"). Mailpit runs as a service of CI's
  `e2e` job.
- **A flaky run found and fixed at its cause:** journey 5 repeated three times failed the third
  time with 429. A refused weak password also counted as a registration. Registrations are now
  counted once the form passes the rules (a refused form costs no hash and no row), with a
  server test; journey 5 then passed 4 of 4.
- **Checked by hand on PostgreSQL:** registration, `pnpm sc admin promote olga`, the reset mail
  in Mailpit; the database and the mail were removed afterwards.
- **Processes:** stopping a background `pnpm --filter @sc/server dev` leaves its node child
  listening. The check servers of pieces 5 and 6 (3975, 3976) were stopped by their process ids;
  the SC-N1 server on 3970 was left as it was.
- `pnpm verify` green; journeys 1–5 passed.
- **Dependencies:** `@node-rs/argon2` 2.2.2 (as Mini Games), `nodemailer` 10.6.1 (SMTP; Mini
  Games has no mailer yet), `@types/nodemailer` 8.0.2.

### Piece 7 report

- **Two-factor sign-in for standalone admins** (D24), on the kit's `newSecret`, `otpauthUri`,
  `matchingStep`, `base32Encode`, `newRecoveryCodes('grouped')`, `recoveryHash` and
  `looksLikeRecoveryCode`:
  - `auth/twoFactor.ts` (port, memory store, `codeAccepted`, `needsTwoFactor`: a local admin),
    `db/twoFactorStore.ts` (the tables of migration 0001; the secret encrypted with
    `SC_DATA_KEY`; a step moves forward and a recovery code is used in one conditional `UPDATE`);
  - `twoFactorRoutes.ts`: `GET /api/me/2fa`, `POST /api/me/2fa/setup`, `POST /api/me/2fa/confirm`
    (10 per 15 minutes per account, Mini Games' rule);
  - sign-in answers `{ twoFactor: true }` until the code comes with the password; the admin area
    (accounts, settings) waits until a local admin has it set up;
  - client: the code field in the sign-in form, `account/TwoFactorSetup.tsx` (key, setup link,
    code, then the ten recovery codes once).
- **Journey 6:** the e2e server seeds one standalone admin (`e2e/rootAdmin.ts`); the journey sets
  up 2FA from the page's key with the kit's `hotp`, keeps a recovery code, signs in with a TOTP code
  and once with the recovery code. It runs once per e2e server start (the admin's 2FA stays set).
- **The independent review:** a fresh agent read `ad20ab0..f482024` (website mode, PostgreSQL,
  accounts, 2FA) and wrote [security-pass.md](security-pass.md): 13 findings, two medium, none
  high. All were fixed except 11 (Mini Games' common-password list), with
  `apps/server/src/securityPass.test.ts`; its "Outcome" table names each fix. In short:
  - limits count the visitor (Fastify `trustProxy` from `SC_TRUSTED_PROXIES`, both modes);
  - confirming 2FA ends the account's other sessions, and enables once;
  - writes only from this origin and as JSON (415 for a plain form; Fastify's 4xx kept);
  - the cookie Secure behind https; errors logged; older reset links ended by a reset;
  - `SC_PUBLIC_ORIGIN` required of a server that mails; setup only where the code is asked;
  - development accounts refused outside development; boxes `v2`, bound to their row;
  - `dev:reset-db` only on port 5570; `pnpm sc` reads no env file (`pnpm dev:sc` in development);
    expired rows deleted on open; a deleted website account not saved again.
- `pnpm verify` green (26 files, 138 tests); journeys 1–6 passed.
- **Dependencies:** `@seasonal/kit` (the same tag v0.8.0) as a root dev dependency, for journey
  6's TOTP codes.

### Piece 8 report

- **The settings catalogue** (D25, CONCEPT §9): `packages/contracts/src/settings.ts` with
  `SETTINGS_CATALOGUE` (label, description, min/max, warning per value), `SettingsSchema` and
  `DEFAULT_SETTINGS`: default N and W, the prize artifacts with their seasons, the further-prize
  and no-prize names, travel and opening durations, confetti.
  - Server: `settings.ts` (`CurrentSettings`, stored over the defaults and checked on load; one
    row of `server_state`, `db/state.ts`), `settingsRoutes.ts` (`GET /api/settings` for
    organisers, `POST /api/admin/settings` for admins with 2FA where required).
  - Copy at creation: the show service reads the settings at every creation; the `created` event
    carries the artifacts (as before) and now the `presentation`; a show from before folds to the
    defaults. The public view carries the presentation; the stage plays its travel, opening and
    confetti (`motionOf`, `useReturn`, `Confetti`, `Ceremony`).
  - Client: `screens/SettingsAdmin.tsx` in the admin area (descriptions and warnings under each
    value, the catalogue's own check before sending); the setup form starts from the defaults.
  - The domain's `ShowSettings` is now the part of the catalogue a show copies (one source).
- **Season tint:** the show's season tints the studio's floor glow (`data-season`, the kit's
  season tokens).
- **Polish** (from the pictures):
  - 1280 × 720: the front case sits lower and smaller on wide, short screens, so the inner row
    stays visible (BACKLOG 21);
  - light theme: lights down as a warm multiply, so the stage darkens instead of greying;
  - phones: the header's links scroll in their row (five links and the user overflowed every
    signed-in page up to 390 px); the game bar's lead gives way up to 480 px (the kit's bar does
    not shrink, BACKLOG 32); the direction panel as a grid (case, steps in pairs, hand-over and
    "End show" on their own rows); the settings' descriptions at the 14 px floor.
- **Pictures:** `e2e/screens.spec.ts` now shoots eight screens (start, board, opening, selected,
  owner, ceremony, result, admin) at the ten check sizes in both themes, plus the phone's
  direction panel, into `.local/screens/proto-v2/`; `proto-v1` was deleted. Each shoot returns to
  1280 × 720, so the next step finds the desktop direction bar (the first run stopped there on a
  phone size). Final run: 160 pictures, no text under 14 px, no sideways overflow.
- **Tests:** `settingsRoutes.test.ts` (who reads and changes, the catalogue's refusals, new shows
  only, stored values over defaults).

### Piece 9 report

- **The chronicle** (CONCEPT §3.5): `GET /api/chronicle` (`showRoutes.ts` `chronicle`): ended
  shows only, newest first, at most `CHRONICLE_LENGTH` = 50, each with its winners, commitment and
  verification from the same `showResult` as the result page. `screens/Chronicle.tsx` at
  `/chronicle`, linked in the header. Test in `routes.test.ts` (ended only, verified, winners).
- `pnpm verify` green (26 files, 139 tests); journeys 1–6 passed.

### Piece 10 report

- **Play-through:** the journeys (1–6) and the pictures play every step: the start page, the
  board, the opening, Begin, a click, Open, Owner, Back to stage, End show, the ceremony, the
  result, the admin area; light and dark; ten PC and phone sizes. Every picture was looked at.
- **Found and fixed:**
  - the ceremony never showed when another show was in registration: the stage followed the
    server's next show at once. A page now keeps a show it watched live until the viewer leaves
    the stage or another show goes live (`useCurrentShow`, test in `feed.test.tsx`);
  - the opening on a phone was cut off (absolute in a stage as tall as its rows): it sits in the
    phone's stage column now, without the table the scoreboard already shows;
  - the scoreboard took four rows of a phone's height: one scrolling row of pills now;
  - the result's case grid cut long names: the gem stands over the name, which wraps.
- **Servers:** the SC-N1 server (3970) and client (5470) ran pre-SC-N2 code; they were stopped and
  `pnpm dev` started again in the background, now on PostgreSQL.

### Extra: the open-rounds listing (BACKLOG 25)

Time was left, so the first BACKLOG item without the owner's word followed, as the task names it.

- `GET /api/public/open-rounds` (`apps/server/src/openRoundsRoutes.ts`) on the contract of
  Seasonal Entertainment `docs/OPEN-ROUNDS.md`, version 1: public, JSON, `max-age=30`; only shows
  whose registration is open now and that the organiser marked "Show on the website"; at most 20;
  the number of players (current claims) and the cases as the most players, never names; both
  times null (shows have no start time and close by hand); `joinUrl` the game under the website
  (website mode) or the public address (local mode).
- The mark: "Show on the website" in the setup form, `listed` in the create request (off by
  default), the `created` event and the model; older shows are not listed.
- Tests: `openRoundsRoutes.test.ts` (the contract's schema, open and listed only, no names, the
  join address of both modes). `pnpm verify` green (27 files, 142 tests); journeys 1–6 passed.
- The website's side: the card's "Sign-up status URL" is
  `https://<website>/games/cases/api/public/open-rounds`, set in Admin → Games once `cases` is on
  the website (BACKLOG 27).

### Choices made without the owner (SC-N2)

- **"Opens in N s"** of the kit's start card is hidden: shows have no start time yet, and the
  card would always say 0.
- **During the opening** the direction holder has only "Begin"; the hand-over and "End show"
  come with the direction bar once begun.
- **The start card's title** is "The next show"; the page's own header carries the name and logo.
- **The game bar's chat button and its unread count** are not shown. The kit's arrivals reach
  only the chat inside the dock, and the dock's own bar shows the count on a phone (BACKLOG 24).
- **Revocation:** AUTH.md has the website make no call to the games. They poll its
  account-changes feed, so the game polls; there is no inbound revocation route.
- **A viewer in the development sign-in** signs in as a player of rank 0; the dev role list stays
  as it was.
- **The organiser's show routes** (`/api/shows…`) exist in every mode: website organisers need
  them, and the standalone lobby will too.

- **The budget rule's piece numbers** do not all match the piece headings. It names "piece 5
  (website mode)", "piece 7 the forgotten-password mail" and "piece 4 the ceremony's animation";
  in the headings these are pieces 4, 6 and 3. The chain follows the rule by content.
- **The blank row of the scoreboard** lights while a blank is open at the front and is never
  struck through: there are many blanks, and one taken blank says nothing.
- **The scoreboard's wording:** "Prize 1: Gold" or "Prize 2" (the existing `prizeTitle`); the
  centre case uses "Prize 1 · Gold" as the task writes it.
- **The reset link:** 32 random bytes, valid one hour, used once; the reset ends every session
  and does not sign in (the user signs in with the new password). Mini Games has no reset yet,
  so there was no rule to follow.
- **Sign-in's refusal** reads "Wrong name, e-mail or password." (Mini Games: e-mail only).
- **Without SMTP** the forgotten-password route answers 503 "mail is not set up on this server".
- **Roles:** a role change ends the account's sessions; a rank change does not (the next request
  carries it). An admin cannot take away their own admin role.
- **The lobby** is the list of every show on the start page, newest first.
- **The development sign-in** stays beside the account forms in development (D24).
- **An admin's sign-in costs two tries** of the 5 per login and address (password, then password
  and code). The limit stays as Mini Games has it.
- **The settings catalogue** holds what has behaviour today: default N and W, the prize artifacts
  with seasons, the further-prize and no-prize names, travel and opening durations, confetti.
  "Registration shows the current claimants" stays always on (its default); rank source and
  chronicle length wait for the owner.
- **The chronicle** lists the 50 newest ended shows; the length becomes a setting once the
  owner names one.
- **On a narrow phone** the game bar shows no "Seasonal Cases" lead (the kit's bar would
  overflow otherwise).
- **A page keeps a show it watched live** until the viewer leaves the stage, so the ceremony
  plays even when the server's next show is already in registration; newcomers get the server's
  choice (fix A unchanged).
- **The open-rounds title** reads "Seasonal Cases: N cases, W prizes"; the kind is "Seasonal
  Cases".

## Night chain SC-N1 (2026-11-21)

Repository, standards and the playable prototype. Branch of the prototype: `proto/cases-v1`
(nothing merged; the owner looks at the branch first).

### Final report

**Done.** All four pieces. Piece 1 on `master`, protected, CI green. Pieces 2–4 on
`proto/cases-v1`, pushed, nothing merged:

- the rules with sealing and commitment, the use cases and the server (piece 2);
- the client (piece 3);
- the three browser journeys, 80 pictures, and the fixes they showed (piece 4).

`pnpm verify` is green (16 files, 81 tests). The three journeys pass once in Chromium. CI of the
last code push (`0557458`): run 44859913784, green: verify, security, docs, and e2e with all three
journeys passing (18 s). This docs-only follow-up has its own run, listed by
`gh run list --branch proto/cases-v1`.

**What runs now.** Server 127.0.0.1:3970 and client 0.0.0.0:5470 run hidden in the background on
`proto/cases-v1`.

- **On this PC:** http://localhost:5470
- **On the phone (same Wi-Fi):** http://192.168.0.66:5470. Windows may ask once whether Node.js
  may accept connections on private networks; allow it for the phone to reach the client.
- **Sign-in names (development sign-in, no password):**
  - a moderator: any name with role `moderator`, or `admin` (who can also use `/admin`);
  - a player: any name with role `player` and a rank from 0 to 5.
- **Quick Test seed:** `sc-n1-01`.

**One two-tab play-through.** One sign-in per browser window: the second person goes in a
private window, or another browser.

1. **Window A:** open http://localhost:5470, sign in as `Mia`, role `admin`. Open **Admin**
   (`/admin`).
2. **Window B (private):** open http://localhost:5470, sign in as `Ana`, role `player`, rank `3`.
3. **A, Admin:** keep Cases 24 and Winners 3, type a label for prize 1 if you like, and click
   **Create show**. Under "Shows", click **Open registration** on the new show.
4. **B, Lobby:** the registration board appears. Click a case to pick it. "Your pick: case n,
   you hold it" appears.
5. **A, Admin:** click, on the same show:
   1. **Fill with bots**;
   2. **Close**;
   3. **Seal** (the commitment now shows on the lobby's artifact table);
   4. **Start show**.
6. **A:** open **Stage**; the direction bar is at the bottom. **B:** open **Stage**; no bar,
   the same stage.
7. **A:** click a case (it moves to the centre), then **Tension**, **Open**, **Prize**,
   **Owner** and **Back to stage**. B sees every step. Open Ana's case too: the lower third names
   her.
8. **A:** go on until "Found" lists every prize, and **End show** lights up. Click it, then
   **See the result**: the winners, every case, and "sealed at … · commitment … · verified".

The shortcut: on `/admin` click **Quick Test** with the seed `sc-n1-01`. It makes a live show with
bots in every case and takes you to the stage with the direction.

**What is open.** BACKLOG part one, among them:

- the foundation (1–6);
- show polish (7–10);
- the sealed assignment encrypted at rest (17);
- sessions across restarts (18);
- two kit adoption items (19 floors for cases, 20 dock reserve).

**Needs the owner's word.**

- The proposals of CONCEPT §14:
  - the five reveal steps, moved by the moderator only;
  - the artifact names and order;
  - Fredoka as the stage font;
  - the defaults N = 24 and W = 3.
- The kit tag v0.5.0, where the concept named v0.4.1 (DECISIONS D15).
- The separate "Start show" step after sealing.
- Adding `e2e` to master's required checks.
- A write right for a sibling clone, so future nights can run pieces in parallel.
- Everything under "Choices made without the owner" below.

**Needs the owner's hand.** The Renovate app for the new repository (no onboarding PR by the end
of the chain).

### Pieces

| Piece                                      | Done                                                                                   | Running                             | Open                            | Needs the owner's word                        | Commits                    | CI run ids                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------- | --------------------------------------------- | -------------------------- | ---------------------------------------------- |
| 1 Repository and standards                 | standards, skeleton, CI, kit v0.5.0, docs; repository created; master protected        | —                                   | Renovate onboarding (see below) | kit tag v0.5.0 vs. the concept's v0.4.1 (D15) | master `0aee998`…`2bf720c` | CI 44850888611 green; CodeQL 44850888453 green |
| 2 Contracts, domain, server                | contracts, domain with probes, application, server with socket tests                   | —                                   | BACKLOG 17, 18 (later)          | the "Start show" step (below)                 | `proto/cases-v1` `90a40e1` | CI 44853721518 green                           |
| 3 The client                               | lobby, board, stage with five steps, direction bar, result, dev admin, component tests | —                                   | screenshots and fixes (piece 4) | Fredoka (CONCEPT §14), the phone's two rows   | `proto/cases-v1` `10b486a` | CI 44856786489 green                           |
| 4 Play-through, browser tests, screenshots | three journeys, 80 pictures, the fixes they showed, docs, hand-over                    | server 3970 and client 5470, hidden | see the final report            | see the final report                          | `proto/cases-v1` `0557458` | CI 44859913784 green (e2e included)            |

### Piece 1 report

- **Commits on master:** `0aee998` standards, `dd65fe2` skeleton, `40a8543` CI, `4b3c5c9` kit,
  `2bf720c` docs. `gh repo create` pushed them; CI run 44850888611 (verify 36 s, security 24 s,
  docs 14 s) and CodeQL run 44850888453 are green.
- **Protection:** `PUT …/branches/master/protection` accepted: required checks `verify`,
  `security`, `docs` (GitHub Actions, strict), admins included, a pull request with 0 approvals,
  no force push, no deletion, linear history not required. The browser job `e2e` (piece 4) is not
  a required check; adding it changes the protection, which needs the owner's word.
- **Reused (copied as pattern, adapted):** Mini Games' package.json scripts, pnpm-workspace.yaml,
  .npmrc, .nvmrc, the three tsconfigs, eslint.config.js with boundaries, prettier, lefthook,
  .editorconfig, .gitattributes, .gitignore (plus `.local/`), renovate.json, SECURITY.md,
  CONTRIBUTING.md, the setup action and the three workflows with their SHAs and digests. The
  kit's `scripts/gitleaks-staged.sh` (Docker answered, so the pre-commit gitleaks step is on).
  The minimatch override from the kit's pnpm-workspace.yaml.
- **Dependencies:** Mini Games' root dev tools at its versions (ESLint 10.13.0, typescript-eslint
  8.71.2, eslint-plugin-boundaries 7.2.0, eslint-import-resolver-typescript 4.4.5, Prettier
  3.9.10, TypeScript 5.9.3, Vitest 5.0.5 with coverage-v8, lefthook 2.2.2, @types/node 22.20.5);
  zod 4.6.7 (contracts); fastify 5.12.7 and tsx 4.23.15 (server); React/react-dom 19.3.1, Vite
  8.3.4, @vitejs/plugin-react 6.1.2, jsdom 30.1.3, Testing Library react 16.3.3 / dom 10.4.2
  (client); `@seasonal/kit` `github:weudlll-cyber/seasonal-kit#v0.5.0`.
- **Tests:** `pnpm verify` green, 7 files, 11 tests. The kit proof (`packages/ui/src/kit.test.ts`)
  imports `@seasonal/kit`, `@seasonal/kit/react` and reads `tokens.css`, `fonts.css`,
  `motion.css`, `fit.css`.

### Piece 2 report

- **Contracts** (`packages/contracts`, zod): show states, roles, ranks 0–5, seasons, reveal steps
  (`show.ts`); artifacts and prize slots (`artifact.ts`); the public, moderator and personal views
  and the result (`view.ts`); the HTTP shapes (`api.ts`); the socket events (`socket.ts`).
- **Domain** (`packages/domain`, pure; time and randomness arrive in the commands): events
  (`events.ts`) and their fold (`model.ts`); setup and artifact table from one settings object
  (`setup.ts`, `settings.ts`); claims, conflict view, standings, bots (`registration.ts`); seal,
  canonical JSON, sha256 commitment, `verify` (`sealing.ts`); the direction holder and the five
  steps (`live.ts`); `decide` (`commands.ts`); the projections (`projection.ts`); the seeded
  sha256 counter generator (`random.ts`).
- **Application** (`packages/application`): `createShowService` with every use case and
  `quickTest`, the in-memory and the JSON-lines stores, replay on start, the season of a date.
- **Server** (`apps/server`, Fastify 5.12.7, @fastify/cookie 11.1.3, @fastify/helmet 13.2.0,
  socket.io 4.8.4, zod 4.6.7; socket.io-client 4.8.4 for its tests): dev sign-in with a signed
  cookie, `/api/me`, the dev admin API, the claim, the socket projections and the direction, a
  same-origin check on the socket handshake. Bound to 127.0.0.1:3970.
- **Tests:** `pnpm verify` green, 14 files, 62 tests. Coverage: domain 94.4 % branches, 99.5 %
  lines (threshold 85 % branches); application 86.4 % branches. The resolution fuzz compares 200
  random claim sets with a brute-force reference.
- **Sabotage probes, each run once:** (a) the rank line removed from `compareClaims` → 3 tests
  red (the rank test, the conflict view, the fuzz); (b) the redaction in `caseView` replaced by
  "always the sealed artifact" → "never leaks" red; (c) one case of the logged assignment altered
  → `verified: false`, kept as a permanent test. (a) and (b) restored before the commit.
- **Removed:** the skeleton's `checkSetup` use case and the health-only `app.test.ts`, replaced by
  the real ones. **Reused:** node:crypto for sha256 and the secure port; `@fastify/cookie`'s
  signing; nothing in the kit covers server logic.
- **Lines (new files):** contracts 13–127, domain 19–152 (tests ≤ 161), application 17–158,
  server 9–180 (tests ≤ 151). The largest source file is `apps/server/src/realtime.ts` (180).

### Piece 3 report

- **Client** (`apps/web`, React 19.3.1 + Vite 8.3.4, socket.io-client 4.8.4): Vite on
  0.0.0.0:5470 proxying `/api` and `/socket.io` to 127.0.0.1:3970; the kit's `themeInit()` and
  `<script src="theme-init.js">`. Routes: `/` (dev sign-in for a guest, the current show's state,
  the registration board with the artifact table), `/show` (the stage), `/results/<id>`, `/admin`
  (N, W, prize labels, "Quick Test seed", Quick Test, Create show, and per show Open
  registration, Fill with bots, Close, Seal, Start show).
- **The stage:** the cases on one to four concentric half circles (`stage/arc.ts`), each with
  number, owner and a season glow; the selected case large in the centre under a CSS spotlight,
  the rest dimmed; tension darkens the stage and shakes the case; open shows the artifact; prize
  its slot and label or "No prize"; owner the lower third with name and rank badge, confetti on
  the main prize only (hidden under reduced motion). The top bar: still hidden, found with owners,
  the short commitment. The direction bar only for the holder.
- **Kit, reused (nothing rebuilt):** `tokens.css`, `fonts.css`, `motion.css`, `fit.css`,
  `shell.css`; `themeInit()`; `useTheme`, `ThemeToggle`; `useFitScale`; `useDockView` and
  `CALL_SLOT` (the dock reserve). `useShownTheme` is not used: nothing on these screens must
  follow the shown theme (no chat frame yet). No `BackLink` (standalone).
- **Built under `packages/ui/src/pending/`:** `fit-cases.css` (BACKLOG 19, "kit: floors for
  cases") and `useDockReserve.ts` (BACKLOG 20, "kit: dock reserve without a chat").
- **Stage font:** Fredoka SemiBold copied from `seasonal-spirits` (its `@fontsource/fredoka`
  5.3.0, latin 600 woff2) to `assets/fonts/` with its OFL licence (`assets/README.md`), used only
  for case numbers and artifact names (`.show-font`).
- **Component tests** (Vitest, jsdom, Testing Library): every step state rendered from a given
  view (`stage/Stage.test.tsx`), the conflict view and the "your rank is higher / lower" hint
  (`board/RegistrationBoard.test.tsx`), the direction bar for the holder only, the client
  importing neither domain nor application and the result showing the server's verdict as it came
  (`App.test.tsx`).
- **Tests:** `pnpm verify` green, 16 files, 80 tests.
- **A flaky-looking timeout fixed at its cause:** a socket test timed out at 5 s in the full run
  (16 workers at once, ~13 s startup each) and passed alone. Workers are now half the cores, at
  most four, as Mini Games (`vitest.config.ts`), and the server's tests get 20 s
  (`apps/server/vitest.config.ts`).
- **Removed:** the skeleton's heading-only `App` and its test. **Lines:** web sources 30–159,
  CSS 21–264, tests 68–117; ui 11–34.

### Piece 4 report

- **Browser tests** (`e2e/`, Playwright 1.64.1, Chromium): their own server on 127.0.0.1:3980
  with data under `.local/e2e/` (deleted at every start, `e2e/server.ts`) and their own client on 5480. Journey 1: admin sign-in, Quick Test N = 12, W = 3, seed `sc-n1-01`, four cases through
  the five steps (a blank first, then the main prize and the two others), each step asserted
  visible and the lower third naming the owner, hand-over to "Noah" in a second context, who ends
  the show; the result says "verified" with the commitment shown at sealing. Journey 2: Lena
  (rank 2) and Hugo (rank 4) claim case 7, Hugo holds it, Lena sees "Your rank is lower" and
  re-picks case 8; Ivy (rank 4, later) sees "Equal rank: the earlier pick holds" and does not
  take it; after the close Hugo owns 7, Lena 8, Ivy nothing. Journey 3: every socket frame a
  player receives is recorded; no public view before the end holds the secret, the assignment or
  an unopened case's artifact, no moderator view reaches the player, and the commitment on the
  lobby before the show equals the result's. Journey 1 finds the main prize by replaying the
  Quick Test from the seed in memory (`e2e/helpers.ts`), not from anything the client receives.
- **CI:** job `e2e` (Chromium) added to `ci.yml`; `browsers.yml` runs the projects `firefox`
  and `webkit-mobile` nightly once master holds the suite.
- **Pictures:** `.local/screens/proto-v1/`, 80 files: board, stage-tension, stage-owner and
  result at the ten check sizes of CONCEPT §7, light and dark, plus `checks.json` (smallest
  visible text and sideways overflow per picture: no text under 14 px, no sideways overflow).
- **Fixed after looking at the pictures:**
  - `stage-owner-1920x1080-dark.png`: every case shrank to the floor and the owner names
    became "bot…". The confetti pieces fall below the stage, the fit counted them as overflow
    and scaled the whole screen down. The confetti now sits outside the measured parts.
  - `stage-owner-375x667-*.png`: the centre case was cut off. The phone's shell bar wrapped to
    three rows, about 140 px against the 64 px the stage subtracts, and the stage could not
    scroll. Phones now get a two-row shell bar of a known 108 px, and below 700 px the stage and
    result screens are their own named scroll areas. The owner's caption sits above the centre
    case on a phone.
  - `stage-owner-1366x768-light.png`:
    - the lower third covered cases 1 and 15; the half circle now keeps the bottom corners free;
    - an opened case's artifact name ran out of its card; the card now shows the gem only,
      with the name as its tooltip;
    - the found prize stood in the "Still hidden" row; it now has its own "Found:" label;
    - case cards keep at least 62 px, so a name like "bot-24" stays whole.
  - `result-1366x768-dark.png` and `board-*`: "Prize 2 · Prize 2" and "Prize 2: Prize 2" for an
    empty label. They now read "Prize 2" (`prizeTitle` in contracts).
  - `board-1366x768-light.png`: the lobby line and the board heading both said "Registration is
    open". The board heading is now "Pick a case" or "The cases and their owners". The lobby
    says "Registration is closed" once it is, where it said "open" before (a real defect).
- **Seen and left:**
  - `stage-owner-1280x720-light.png`: the large centre case covers the two dimmed cases
    behind it (19, 20) at the smallest PC height. They are dimmed and stand behind the
    spotlight, as on a studio floor.
  - `board-1920x1080-dark.png`: the artifact table sits below an empty band, because the board
    keeps the dock's height free (DECISIONS D7).
  - `stage-tension-1280x720-light.png`: "lights down" in the light theme greys the stage rather
    than darkening it to night. Readable, but less dramatic than in dark.
- **Tests:** `pnpm verify` green, 16 files, 81 tests; the three journeys in Chromium passed
  (journey 1 24 s, journey 2 28 s, journey 3 36 s).
- **Dependencies added:**
  - @playwright/test 1.64.1, Mini Games' version;
  - tsx 4.23.15 at the root, to start the test server;
  - the workspace packages `@sc/application` and `@sc/domain` as root dev dependencies, for the
    Quick Test replay.

### Choices made without the owner

- **"Start show":** the concept goes SEALED → LIVE, and the task names no start action. The
  smallest option: a separate start step (`start` use case, `POST /api/dev/shows/:id/start`, a
  button in the dev admin); whoever starts holds the direction. Quick Test starts by itself.
- **Closed registration has no state of its own:** the show stays in `registration` with
  `registrationOpen: false` until it is sealed, so the five states of the task stay as they are.
- **The five steps as one use case:** `step(showId, by, step)` with `tension | open | prize |
owner | return` in place of five functions; the socket sends `direction:step`.
- **"The current season"** (relics and the blank, CONCEPT §6): the meteorological season of the
  show's creation date in the northern hemisphere (`packages/application/src/season.ts`).
- **Who counts as a moderator:** roles `moderator` and `admin`. The hand-over goes only to a
  moderator who is watching the show (the "signed-in moderator" of the task).
- **One id per sign-in:** the dev sign-in draws a new UUID each time, so two tabs with the same
  name are two people.
- **The fit hook's game:** the kit's `useFitScale` takes `mini-games` or `bingo` only. The
  screens pass `mini-games` for its 0.6 scale floor (Bingo's floor of 1 would never shrink); the
  readable floors come from `data-sk-game="cases"` (BACKLOG 19).
- **The phone's "two rows":** at widths under 700 px the cases form two rows in a horizontally
  scrolling, named area ("Cases"), so no case gets smaller than the 44 px target.
- **The dock reserve** applies to all three stage screens (registration board, stage, result)
  in the desktop view only, as the kit's dock does.
- **Selecting a case** is a click on the case for the holder; the bar holds the later steps.
- **A found prize:** it enters the top bar's "found" list at its "Prize" step; at "Open" the
  artifact is already visible on the stage but its meaning is not yet named.
- **Phones below the floors:** the stage and the result scroll as their own named region
  ("Stage", "Result"); the lobby with its board scrolls as a normal page.
- **The `e2e` job is not a required check** of master; the protection lists `verify`,
  `security`, `docs` as set in piece 1.
- **Kit tag:** `git ls-remote` showed `v0.5.0` as the newest tag (the task expected v0.4.1). The
  task's rule is the newest tag, so `v0.5.0` is pinned (DECISIONS D15).
- **Kit's local checkout:** another session was switching `C:\Users\weudl\seasonal-kit` while this
  chain read it (`src/react/` vanished between two reads). The kit was therefore read from the
  installed package of the pinned tag, not from the local checkout.
- **CodeQL permissions:** `security-events: write` sits on the job, so the workflow's top level is
  `contents: read` like every other workflow (Mini Games has both at the top).
- **Browsers workflow:** until master holds `e2e/playwright.config.ts`, the nightly job prints a
  notice and runs nothing, so it is never red for a suite that is not merged yet.

### Needs the owner's hand

- **Renovate:** `renovate.json` is in the tree; whether the Renovate app covers the new repository
  is the owner's setting. At the end of the chain no onboarding PR had appeared
  (`gh pr list --state all` empty).
