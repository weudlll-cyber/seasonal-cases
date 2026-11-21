# Handover

The state of Seasonal Cases for a new planning chat. Updated at the end of every piece.

## What the project is

A moderated community live show for the Seasonal Entertainment community: players claim numbered
cases, the server seals an artifact into each case with a public commitment, and a moderator opens
the cases: a click, then three steps (D19). [CONCEPT.md](CONCEPT.md) v1.4 governs it; the decisions are in
[DECISIONS.md](DECISIONS.md).

## Where things stand

- **Phase:** P0 bootstrap done on `master` (night chain SC-N1, piece 1). The P1 prototype is
  complete on `proto/cases-v1` (pieces 2–4), not merged: the owner plays it first.
- **Repository:** `weudlll-cyber/seasonal-cases` (public). Master is protected (checks `verify`,
  `security`, `docs`; a pull request; no force push, no deletion). Kit `v0.5.0` on master
  (D15), `v0.8.0` on `proto/cases-v1` (D18).
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

  The dev role "moderator" is now "organiser". Concept v1.4.

- **Morning sheet of the chain:** [NIGHT-RUN.md](NIGHT-RUN.md). It has the final report, the
  play-through steps, every choice made without the owner, and the pictures seen and left.

## What runs

- `pnpm verify` (format, lint, typecheck, tests) and `pnpm test:coverage`.
- `pnpm dev`: server 127.0.0.1:3970, client 0.0.0.0:5470 (http://localhost:5470; the phone at
  http://192.168.0.66:5470 on the home Wi-Fi). Left running hidden for the owner at the end of
  SC-N1.
- The development services: `docker compose --env-file ops/compose.dev.env -f
ops/compose.dev.yml up -d` (PostgreSQL 127.0.0.1:5570, Mailpit SMTP 1170, web
  http://localhost:8570); they restart by themselves. `pnpm dev:reset-db` empties the database.
- `pnpm dev` keeps everything in PostgreSQL (`apps/server/dev.env`) and rebuilds the shows from
  their events on start. Without `DATABASE_URL` the server uses `.local/data/*.jsonl` and memory.
- `pnpm e2e --project=chromium`: the journeys on their own stack (3980/5480; 3990/5485 for
  website mode), without a database.
- `pnpm e2e --project=screens`: the pictures at the check sizes, light and dark.
- The store tests need PostgreSQL: the development database, or `SC_TEST_DATABASE_URL` (CI).
- Journey 5 needs Mailpit (the development services above; a service in CI).
- `pnpm dev:sc admin promote <name>` makes a standalone account an admin on the dev database
  (`pnpm sc …` on a real server, with `DATABASE_URL` and `SC_DATA_KEY` in its shell); that admin
  sets up two-factor sign-in in the admin area before the accounts and settings open.
- Journey 6 signs in as the e2e server's seeded admin and runs once per e2e server start.
- Stopping a background `pnpm --filter @sc/server dev` leaves its node child running: end the
  process that listens on the port as well.

## What is open

[BACKLOG.md](BACKLOG.md) part one; summary in [OPEN.md](OPEN.md).

## Needs the owner's word

- Whether the show is fun (the P1 gate), after playing it.
- The proposals of CONCEPT §14 that remain: the artifact names and order, Fredoka as the stage
  font, the defaults N = 24 and W = 3. Names, order and defaults are settings in the admin area
  now (D25), so the owner can change them there.
- The choices of the night recorded in [NIGHT-RUN.md](NIGHT-RUN.md) "Choices made without the
  owner", among them the separate "Start show" step after sealing.
- `e2e` as a required check of master (BACKLOG 22).
- The stage's motion (piece 2 of SC-N2), proposals by the chain's decision rule: the travel to
  the front and back 0.8 s ease-in-out, the opening 1.6 s (lid in the first 45 %, the artifact
  from 40 %, the meaning from 80 %), the closing before the way home 0.3 s. Travel and opening
  are settings now (D25); the ease and the closing stay in `apps/web/src/stage/motion.ts`.
- The ceremony's pace and order (piece 3 of SC-N2): one winner every 2.5 s, from the lowest
  prize up to the main prize, then "See the result".
- Website mode's two rules (piece 4 of SC-N2): the rank is the number of the member's valid
  Discord steps, at most 5; the steps' icons are the badges beside the name on the stage, the
  board and the header.
- The website's side for the slug `cases` (BACKLOG 27): it lives in the website repository.
- The independent review's questions ([security-pass.md](security-pass.md), "Out of scope or for
  the owner"; BACKLOG 29–31):
  - the enrolment window: a promoted admin enrols any authenticator with the password alone;
  - no way to reset another admin's 2FA or re-issue recovery codes;
  - a longer common-password list than Mini Games' ten (finding 11);
  - names: any Unicode letters without normalisation, so two names can look alike;
  - registration's 409 tells whether an e-mail has an account;
  - website mode shares one origin with the website and the other games;
  - plain SMTP and an `http://` feed origin belong on a trusted network or behind TLS;
  - the TOTP brute-force rate under Mini Games' 10 per 15 minutes.
- A write right for a sibling clone of this repository (for example
  `C:\Users\weudl\seasonal-cases-2`) would let future night chains run independent pieces in
  parallel; tonight's permissions cover this folder only.

## Needs the owner's hand

- The Renovate app for the new repository: no onboarding PR appeared during SC-N1.
