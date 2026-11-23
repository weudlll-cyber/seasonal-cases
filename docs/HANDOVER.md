# Handover

The state of Seasonal Cases for a new planning chat. Updated at the end of every piece.

## What the project is

A moderated community live show for the Seasonal Entertainment community: players claim numbered
cases, the server seals an artifact into each case with a public commitment, and a moderator opens
the cases: a click, then three steps (D19). [CONCEPT.md](CONCEPT.md) v1.6 governs it; the decisions are in
[DECISIONS.md](DECISIONS.md).

## Where things stand

- **Phase:** P0 bootstrap done on `master` (night chain SC-N1, piece 1). The P1 prototype is
  complete on `proto/cases-v1` (pieces 2–4), not merged: the owner plays it first.
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
  Piece 4: the installer, `sudo ./deploy/install.sh` ([INSTALL.md](INSTALL.md)), both modes,
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

- **Night chain SC-N6 (running, 2026-11-23):** piece 1 done: kit v0.11.1 (D47), sign-in's
  brake against guessing back in front of the cap (D48), "Unclaimed" whole on the phone, D42–D45
  confirmed (D46). Pieces 2 and 3 done: the case that really opens (D49, `stage/CasePicture.tsx`,
  the phases in `stage/motion.ts`) and the showcase page `/dev/opening` (development only). Next:
  the opening's frames as pictures, a review. State per piece in [NIGHT-RUN.md](NIGHT-RUN.md).

- **Kit:** `kit: pinned v0.11.1, newest v0.11.1, current` (`pnpm kit:check`, 2026-11-23, SC-N6
  piece 1). v0.11.1 widens the kit's peer ranges and changes its own Renovate rules; nothing in
  Cases changed with it. The pin moves only on the owner's word.
- **Morning sheet of the chain:** [NIGHT-RUN.md](NIGHT-RUN.md). It has the final report, the
  play-through steps, every choice made without the owner, and the pictures seen and left.

## What runs

- `pnpm verify` (format, lint, typecheck, tests, then the kit-version line) and
  `pnpm test:coverage`. `pnpm kit:check` alone prints the pinned kit tag against the newest; CI's
  `verify` job writes it to the job summary and warns when behind, never failing (D41); Renovate
  has a rule for the kit's tags once the app is enabled.
- `pnpm dev`: server 127.0.0.1:3970, client 0.0.0.0:5470 (http://localhost:5470; the phone at
  http://192.168.0.66:5470 on the home Wi-Fi). Left running hidden for the owner at the end of
  SC-D5 (rc.3), on PostgreSQL; the development database holds three accounts the chains did not make
  ("Plan-Claude", "Walter", "walter"), left as they are; the play-through steps are in
  [NIGHT-RUN.md](NIGHT-RUN.md) "Final report" (Quick Test seed `sc-n1-01`).
- The development services: `docker compose --env-file ops/compose.dev.env -f
ops/compose.dev.yml up -d` (PostgreSQL 127.0.0.1:5570, Mailpit SMTP 1170, web
  http://localhost:8570); they restart by themselves. `pnpm dev:reset-db` empties the database.
- `pnpm dev` keeps everything in PostgreSQL (`apps/server/dev.env`) and rebuilds the shows from
  their events on start. Without `DATABASE_URL` the server uses `.local/data/*.jsonl` and memory.
- `pnpm e2e --project=chromium`: the journeys on their own stack (3980/5480; 3990/5485 for
  website mode), without a database.
- `pnpm e2e --project=screens`: ten screens and the phone's direction panel at 1536 × 768,
  1280 × 720 and 390 × 844, light and dark, into `.local/screens/proto-v5/` (with the
  registration's pending page).
- `pnpm e2e --project=<p>` for `chromium-mobile`, `firefox`, `firefox-mobile`, `webkit` and
  `webkit-mobile`: the journeys in every browser and size (nightly on master); all 36 passed on
  2026-11-23, one project per run.
- The store tests need PostgreSQL: the development database, or `SC_TEST_DATABASE_URL` (CI).
- Journey 5 needs Mailpit (the development services above; a service in CI).
- `pnpm dev:sc admin promote <name>` makes a standalone account an admin on the dev database
  (`pnpm sc …` on a real server, with `DATABASE_URL` and `SC_DATA_KEY` in its shell); that admin
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

- The merge of `proto/cases-v1` and the tag `v1.0.0` ([RELEASING.md](RELEASING.md)).
- The second security review's remaining question: the feed behind the site's Caddy (BACKLOG
  35). Decided 2026-11-22 and built: the limits, no bots in real shows, the asked trusted range
  (D34, D37), the ceremony and the motion as built (D30, D32), the website-mode rank (D31).

- Whether the show is fun (the P1 gate), after playing it.
- The proposals of CONCEPT §14 that remain: the artifact names and order, Fredoka as the stage
  font, the defaults N = 24 and W = 3. Names, order and defaults are settings in the admin area
  now (D25), so the owner can change them there.
- The choices of the night recorded in [NIGHT-RUN.md](NIGHT-RUN.md) "Choices made without the
  owner", among them the separate "Start show" step after sealing.
- The website's side for the slug `cases` (BACKLOG 27): it lives in the website repository.
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
    sign-ins' cap the brake against guessing is back (D48): 20 tries per 15 minutes per
    address, 5 per login and address.
  - Open with D48: for one address the brake (20 per 15 minutes, every try) is always stricter
    than the cap (20 a minute), so the cap never answers first, and a room of more than 20
    people behind one address cannot all sign in within 15 minutes (the reason D45 dropped the
    brake). Counting only failed tries would need a limiter that looks before it takes, which
    the kit's RateLimiter does not offer. Built as the task says, the effect is the owner's
    to weigh.

- **Where this repository departs from the kit's HANDBOOK (v0.11.0)**, read once on
  2026-11-23; nothing changed for them:
  - the header is the game's own `ShellBar`, not the kit's `AppHeader` (and no `DevSignIn`):
    the kit's header folds into a Menu, this one wraps on a phone (D29);
  - coverage thresholds are the domain's 90 % lines / 85 % branches and the application's
    80 / 75 (CLAUDE.md "game logic 85 % branches"), not 95 % of lines, branches and functions
    everywhere;
  - the season of a show comes from its date (UTC month, `packages/application/src/season.ts`),
    not from the website's season feed (`seasonFeedReader`);
  - the morning sheet is one file, `docs/NIGHT-RUN.md`, with a section per chain, not
    `docs/NIGHT-<date>.md`;
  - some browser tests wait on the clock (`waitForTimeout` in journey 1 for the case's
    travel), where the handbook passes time in;
  - the handbook asks that each rule's test be run once without the change; the chains did
    that for the probes recorded in BACKLOG "Checks run", not for every rule.

## Needs the owner's hand

- The Renovate app for the new repository: no onboarding PR appeared during SC-N1.
