# Handover

The state of Seasonal Cases for a new planning chat. Updated at the end of every piece.

## What the project is

A moderated community live show for the Seasonal Entertainment community: players claim numbered
cases, the server seals an artifact into each case with a public commitment, and a moderator opens
the cases: a click, then three steps (D19). [CONCEPT.md](CONCEPT.md) (its newest version) governs it; the decisions are in
[DECISIONS.md](DECISIONS.md).

## Where things stand

- **Now (2026-11-26, night chain SC-N12):** `1.1.0-rc.4` on `kit/v0.17-adoption` (draft PR #5),
  not merged, not tagged: the owner looks at it first. The kit is at v0.32.0 with every part it
  offers the game, the load check apart (D79–D85): step badges and API client; guarded feed
  fetch, https headers and two database roles; `ops/install.sh` and the installed command
  `scases` (the kit's admin command), operator address, host baseline, container hardening, one
  [operator guide](operator-guide.md); the kit's guards, sweep and website stand-in. Rehearsed on
  the owner's PC with a copy of the development data; the list for a real server, a show to play
  and what looks different are in [NIGHT-2026-11-26-kit-0.32.md](NIGHT-2026-11-26-kit-0.32.md).
- **Night chain SC-N11 (2026-11-25):** on a server Cases runs in Docker only (D76–D78),
  `1.1.0-rc.3`.
- **Night chain SC-N10 (2026-11-25):** `1.1.0-rc.2` on `kit/v0.17-adoption` (draft PR #5),
  kit v0.22.0 with its backup and server parts; not merged: the owner looks at it first. Open: the
  kit's finding BACKLOG 70. Needs the owner's hand: the age key on the VPS, the GitHub settings
  (59). Word: the privacy contact text.
- **Phase:** version 1.0.0 on `master`, tag `v1.0.0` (task SC-R1, 2026-11-23): P0 to P3
  built, P4 (installer, security reviews) built; the first show on a server is next. The work
  branch `proto/cases-v1` is merged and deleted; the chains below ran on it.
- **Working cheaply** (2026-11-23, DECISIONS D54): CLAUDE.md has the section of that name,
  the saving rules every Seasonal project follows.
- **Repository:** `weudlll-cyber/seasonal-cases` (public). Master is protected (checks `verify`,
  `security`, `docs` and, since 2026-11-22, `e2e` (D38); a pull request; no force push, no
  deletion). Kit `v0.5.0` on master
  (D15), `v0.11.1` on `proto/cases-v1` since 2026-11-23 (D47; `v0.11.0` earlier that day,
  D40; `v0.8.0` before, D18).
- **On `proto/cases-v1`:**
  - the contracts;
  - the domain:
    - registration with rank conflicts;
    - sealing with a sha256 commitment;
    - the click and three steps under one direction holder (SC-N2);
    - projections that never hold unopened content;
  - the use cases with the event log (JSON lines, or PostgreSQL since SC-N2) and Quick Test;
  - the server with dev sign-in, dev admin API, claim and the socket side;
  - the client: lobby, registration board, stage, direction bar, result, dev admin, on the kit;
  - three browser journeys (CI job `e2e`) and 80 pictures in `.local/screens/proto-v1/`.
- **Night chain SC-N2 (running):** kit v0.8.0 (D18), the click and three steps (D19), the
  scoreboard (D20), fix A (the stage follows live → sealed → registration → setup → ended) and
  fix B (no direction bar after the end) are on `proto/cases-v1` (piece 1). The moving case
  (D21): the travel to the front and home, the slow opening (piece 2). The start page on the
  kit's start card, the opening with Begin, focus mode with the kit's game bar, the ceremony and
  the result on the kit's result frame (D22, piece 3). Website mode (D23, piece 4):
  - the sign-in through the website on the kit's checks;
  - accounts keyed by website origin and user id, with rights mapped and the rank and badges
    taken from the Discord steps;
  - the account-changes feed, 7-day sessions in a session store, the docked website chat, the
    back link, and everything under `/games/cases/`.

  PostgreSQL (D26, piece 5): accounts, sessions, the feed's cursor and the shows' event log in
  the database, the sealed secret encrypted with `SC_DATA_KEY`; tables for 2FA are ready.

  Standalone accounts (D24, piece 6): registration, sign-in by name or e-mail, the forgotten
  password by mail (Mailpit in development), roles and ranks in the admin area, the first admin
  by `pnpm sc admin promote <name>` (`pnpm dev:sc …` on the development database), the lobby on
  the start page and "My matches".

  Two-factor sign-in for standalone admins (D24, piece 7), then the independent review
  ([security-pass.md](security-pass.md)): 13 findings, all fixed but one. The settings catalogue
  in the admin area (D25, piece 8): new shows copy its values; the season tint, the polish from
  the pictures. The chronicle at `/chronicle` (piece 9).

  The open-rounds listing for the website (BACKLOG 25): `/api/public/open-rounds`, the
  organiser's "Show on the website" mark. CI of the hand-over commit `1172a27`: 44898497976
  green; this extra's run is on the branch (`gh run list --branch proto/cases-v1`).

  The dev role "moderator" is now "organiser". Concept v1.4.

- **Night chain SC-N3 (done):** toward production. Piece 1: prize names through one helper,
  look-alike names refused, the common-password dictionary, `pnpm sc admin reset-2fa`.
  Piece 2: `pnpm build` and `pnpm start` (one process, the built client, health and ready,
  JSON logs, graceful stop), every variable in [CONFIG.md](CONFIG.md).
  Piece 3: the member summary for the website's profile (`/api/website/member-summary`).
  Piece 4: the installer, `sudo ./deploy/install.sh` ([INSTALL.md](operator-guide.md)), both modes,
  `--update` and `--check`, tested by `deploy/test/installer.test.sh` and shellcheck in CI.
  Piece 5: sound, synthesised (Web Audio), off until a viewer turns it on in the game bar.
  Piece 6: Firefox passes the journeys; WebKit's findings are in BACKLOG 12 (not fixed: budget
  rule). Piece 7: the second independent security review, its fixes; release candidate
  `1.0.0-rc.1` ([CHANGELOG](../CHANGELOG.md), [RELEASING.md](RELEASING.md)).
  Piece 8: the play-through, 54 pictures in `.local/screens/proto-v3/`, three layout fixes.
  Follow-up (2026-11-22): a phone path through the game bar's panel for the journeys, Escape
  closes the panels, the bar keeps the stage's gutter, the result's rings whole, the start card
  counts picks; WebKit's phone journeys 1 and 3 still stall on slow drawing (BACKLOG 12).

- **Night chain SC-N4 (done):** the owner's decisions of 2026-11-22 (D27–). Piece 1: the
  gem turns only in the centre case and the ceremony (D27), the logo per theme (D28), the phone
  menu wraps (D29), the spotlight painted once, WebKit's phone journeys pass, journey 4 on the
  test-only plain cookie, the admin's setup form no longer loses what was typed. Concept 1.6.
  Piece 2: no bots in real shows (403 outside development), unclaimed cases ("Unclaimed", their
  prizes "not won" everywhere), "End show" asks before an early end (D32–D34). Concept 1.7.
  Piece 3: recovery codes re-issued with the password and a code (D35); names of Latin letters,
  digits, `-`, `_` and a registration that answers alike for every e-mail (D36); 60 a minute
  per address for claims and sign-ins, the installer asks for the trusted range (D37).
  Piece 4: `e2e` is a required check of master's protection (D38).
  Piece 5: the applause button for everyone watching a live show; the stage counts it and the
  confetti grows with it (D39). Concept 1.8.
  Piece 6: the third independent review: a socket message without its ack no longer stops the
  server; Latin look-alikes out of names; a re-issue ends other sessions; mail capped per
  address. Version `1.0.0-rc.2`.
  Piece 7: the play-through and 62 pictures in `.local/screens/proto-v4/` (the header's height
  loop and the ceremony's pictures fixed); the six-project browser matrix stopped at 19 of 36,
  Firefox failing there (BACKLOG 40, closed by SC-D5).

- **Day chain SC-D5 (done, 2026-11-23):** kit v0.11.0 replaces four stand-ins (D40); the
  kit-version watch `pnpm kit:check` (D41); the four proposals D42–D45 (registration with a
  confirmation link, a letter in every name, applause per account or address, separate address
  budgets); the six-project browser matrix 36 of 36 under load; a fourth independent review and
  its fixes; 66 pictures in `.local/screens/proto-v5/`; version `1.0.0-rc.3`.

- **Night chain SC-N6 (done, 2026-11-23):** kit v0.11.1 (D47), sign-in's brake against
  guessing in front of the cap (D48), "Unclaimed" whole on the phone, D42–D45 confirmed (D46);
  the case that really opens (D49, `stage/CasePicture.tsx`, the phases in `stage/motion.ts`);
  `/dev/opening` (development only); the opening's frames in `.local/screens/opening-frames/`; a
  fifth independent review, six of seven low findings fixed. Final report in
  [NIGHT-RUN.md](NIGHT-RUN.md).

- **Task SC-P7 (done, 2026-11-23):** the owner's D50–D53. The artifact rises straight up from
  the case's centre (it started up to 57 px off and drifted in; measured centred in every frame
  now); the sign-in brake counts failures only, 20 per 15 minutes per address and per account
  (`auth/failureBrake.ts`); a visually hidden polite live region says the opened artifact at the
  Open step; the inner row at 1280 × 720 stays as it is. Version `1.0.0-rc.4`.

- **Night chain SC-N7 (done, 2026-11-24):** branch `kit/v0.17-adoption`, draft PR, version
  `1.1.0-rc.1`, nothing merged or tagged. Piece 1 done: kit v0.17.0 with the migrations of
  0.12.0–0.17.0 (D56, D57), no stand-in left in `packages/ui`. Piece 2 done: the kit's
  `AppHeader` with its folded Menu (D58). Piece 3 done: the game read against the handbook,
  the replacements that keep the look (season colours as the kit's tokens, `sk-visually-hidden`,
  arena tones as own tokens) and the rest listed (BACKLOG 58–65). Piece 4 done: the draft PR's
  four required checks green, a whole show played, the pictures in `.local/screens/sc-n7/`.
  Night chain SC-N8 (running): the phone bar and the largest text are fixed and asserted in the
  screens run (D60, BACKLOG 65, 66 closed). Privacy is built (D61, BACKLOG 58 closed): `/account`
  (download and delete), `/privacy`, the erasure (tombstone, event log redacted, shows folded
  again), `SC_PRIVACY_CONTACT`, 14 days of logs from the installer. The four kit parts are built (D62, BACKLOG 60 closed): the back link in focus mode,
  the website's season feed, `afterFonts`, `withoutChat`. The production bundle holds no development tool and the mail
  tokens travel after `#` (D63, BACKLOG 61, 62 closed; `pnpm bundle:check`). The accessibility check (axe, D66, BACKLOG 71) runs in the e2e job;
  one finding of the kit's `DockedScreen` waits for the kit (BACKLOG 70). State per piece in
  [NIGHT-RUN.md](NIGHT-RUN.md).

- **Task SC-R1 (2026-11-23):** the brake per account and address (D55: 20 failures brake one
  account at one address, 100 the account everywhere, 20 an address); version `1.0.0`; master's
  "Working cheaply" (D54) brought in; `proto/cases-v1` merged into master and tagged `v1.0.0`
  ([TAGS.md](TAGS.md)); the branches deleted.

- **The kit's server parts (D69, D70):** CSRF check, security headers, session cookie, guarded
  fetch and the health routes `/healthz`, `/readyz` are the kit's.
- **Backups (D68, BACKLOG 72):** the kit's, set up by the installer with the owner's age public key
  ([operator-guide.md](operator-guide.md), section 5, with the drills). **Needs the owner's
  hand on the VPS:** make the key on the own computer, give the installer the public key, pull the
  first backup and drill it.
- **Kit:** `kit: pinned v0.32.0, newest v0.33.0, 1 release behind` (`pnpm kit:check`,
  2026-11-26, end of night chain SC-N12; master pins v0.11.1 until the merge). The pin moves only
  on the owner's word.
- **Morning sheets:** the newest chain's is
  [NIGHT-2026-11-26-kit-0.32.md](NIGHT-2026-11-26-kit-0.32.md); earlier chains are in
  [NIGHT-RUN.md](NIGHT-RUN.md).

## What runs

- `pnpm verify` (format, lint, typecheck, tests, then the kit-version line) and
  `pnpm test:coverage`. `pnpm kit:check` alone prints the pinned kit tag against the newest; CI's
  `verify` job writes it to the job summary and warns when behind, never failing (D41); Renovate
  has a rule for the kit's tags once the app is enabled.
- On a server: the compose stack (`ops/compose.yml`: the game, its one-shot migration and
  PostgreSQL), installed and checked by `ops/install.sh`; the installed command `scases`
  updates, rolls back, backs up, restores and uninstalls. CI job `deploy` tests both, job
  `image` the image.
- `pnpm dev`: server 127.0.0.1:3970, client 0.0.0.0:5470 (http://localhost:5470; the phone at
  http://192.168.0.66:5470 on the home Wi-Fi), on PostgreSQL; the development database holds
  accounts the chains did not make, left as they are. Quick Test seed `sc-n1-01`. What is left
  running after the newest chain is in its sheet.
- The development services: `docker compose --env-file ops/compose.dev.env -f
ops/compose.dev.yml up -d` (PostgreSQL 127.0.0.1:5570, Mailpit SMTP 1170, web
  http://localhost:8570); they restart by themselves. `pnpm dev:reset-db` empties the database.
- `pnpm dev` keeps everything in PostgreSQL (`apps/server/dev.env`) and rebuilds the shows from
  their events on start. Without `DATABASE_URL` the server uses `.local/data/*.jsonl` and memory.
- `pnpm e2e --project=chromium`: the journeys on their own stack (3980/5480; 3990/5485 for
  website mode), without a database.
- `pnpm e2e --project=screens`: every screen at CONCEPT §7's sizes in both themes into
  `.local/screens/sc-n12/`, and each walked by the kit's `sweep` (about half an hour); the
  website-mode header's run beside it.
- `pnpm e2e --project=<p>` for `chromium-mobile`, `firefox`, `firefox-mobile`, `webkit` and
  `webkit-mobile`: the journeys in every browser and size (nightly on master); all 36 passed on
  2026-11-23, one project per run.
- The store tests need PostgreSQL: the development database, or `SC_TEST_DATABASE_URL` (CI).
- Journey 5 needs Mailpit (the development services above; a service in CI).
- `pnpm dev:sc admin promote <name>` makes a standalone account an admin on the dev database
  (`sudo scases admin …` on a server); that admin
  sets up two-factor sign-in in the admin area before the accounts and settings open.
- Journey 6 signs in as its browser project's seeded admin (`e2e/rootAdmin.ts`), so it runs
  once per project and e2e server start.
- Registering a local account needs mail: the link arrives in Mailpit (http://localhost:8570)
  in development; without SMTP the registration answers 503.
- Stopping a background `pnpm --filter @sc/server dev` leaves its node child running: end the
  process that listens on the port as well.

## What is open

[BACKLOG.md](BACKLOG.md) part one; summary in [OPEN.md](OPEN.md).

## Needs the owner's word

- The merge of `kit/v0.17-adoption` (PR #5) and its tag ([RELEASING.md](RELEASING.md)).
- Decided 2026-11-22 and built: the limits, no bots in real shows, the asked trusted range
  (D34, D37), the ceremony and the motion as built (D30, D32), the website-mode rank (D31).

- Whether the show is fun (the P1 gate), after playing it.
- The proposals of CONCEPT §14 that remain: the artifact names and order, Fredoka as the stage
  font, the defaults N = 24 and W = 3. Names, order and defaults are settings in the admin area
  now (D25), so the owner can change them there.
- The choices of the night recorded in [NIGHT-RUN.md](NIGHT-RUN.md) "Choices made without the
  owner", among them the separate "Start show" step after sealing.
- The website's side for the slug `cases` (BACKLOG 27): it lives in the website repository.
- The kit's game bar at a 200 % root font (BACKLOG 77): a change would alter the bar's look.
- The independent review's questions that remain ([security-pass.md](security-pass.md), "Out of
  scope or for the owner"; the enrolment window, recovery codes, names and the registration
  answer are decided and built, D35, D36):
  - no way to reset another admin's 2FA from the admin area (only `pnpm sc admin reset-2fa`);
  - website mode shares one origin with the website and the other games;
  - plain SMTP and an `http://` feed origin belong on a trusted network or behind TLS;
  - the TOTP brute-force rate under Mini Games' 10 per 15 minutes.
- A write right for a sibling clone of this repository (for example
  `C:\Users\weudl\seasonal-cases-2`) would let future night chains run independent pieces in
  parallel; tonight's permissions cover this folder only.

- **The four decisions of 2026-11-23, proposals until the owner confirmed them** (D42–D45,
  confirmed by D46):
  - registration makes the account only once the mail's confirmation link is used (24 h, once);
  - an account name contains at least one letter;
  - applause is limited per account for signed-in users and per address for guests, and guests
    may applaud;
  - separate address budgets: sign-ins 20 a minute, claims 300 a minute; in front of the
    sign-ins' cap the brake against guessing (D51): 20 failed sign-ins per 15 minutes per
    address and per account, a success not counted.
  - The lock-out question of D51 is closed by D55: 20 failures brake an account at one address
    only; 100 brake it everywhere; an address is braked from 20 across all accounts.

- **Where this repository departs from the kit's HANDBOOK (v0.17.0)**, read against the game on
  2026-11-24 (night chain SC-N7, piece 3; the open items are BACKLOG 59 and 64):
  - coverage thresholds are the domain's 90 % lines / 85 % branches and the application's
    80 / 75 (CLAUDE.md "game logic 85 % branches"), not 95 % of lines, branches and functions
    everywhere (decided 2026-11-24, D64: no coverage target, tests where they guard something
    real; BACKLOG 63, closed);
  - the repository's GitHub settings differ from the handbook's list (59);
  - the steps "before production" are not all done (64); `.gitleaksignore` is not added;
  - the earlier chains' morning sheets are one file, `docs/NIGHT-RUN.md` (since SC-N12 a file
    per chain);
  - some browser tests wait on the clock (`waitForTimeout` in journey 1 for the case's
    travel), where the handbook passes time in;
  - the handbook asks that each rule's test be run once without the change; the chains did
    that for the probes recorded in BACKLOG "Checks run", not for every rule.

## Needs the owner's hand

- The Renovate app for the new repository: no onboarding PR appeared during SC-N1.
