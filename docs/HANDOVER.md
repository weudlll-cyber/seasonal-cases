# Handover

The state of Seasonal Cases for a new planning chat. Updated at the end of every piece.

## What the project is

A moderated community live show for the Seasonal Entertainment community: players claim numbered
cases, the server seals an artifact into each case with a public commitment, and a moderator opens
the cases in five reveal steps. [CONCEPT.md](CONCEPT.md) v1.0 governs it; the decisions are in
[DECISIONS.md](DECISIONS.md).

## Where things stand

- **Phase:** P0 bootstrap done on `master` (night chain SC-N1, piece 1). The P1 prototype is
  complete on `proto/cases-v1` (pieces 2–4), not merged: the owner plays it first.
- **Repository:** `weudlll-cyber/seasonal-cases` (public). Master is protected (checks `verify`,
  `security`, `docs`; a pull request; no force push, no deletion). Kit `v0.5.0` pinned
  (DECISIONS D15).
- **On `proto/cases-v1`:**
  - the contracts;
  - the domain:
    - registration with rank conflicts;
    - sealing with a sha256 commitment;
    - the five steps under one direction holder;
    - projections that never hold unopened content;
  - the use cases with the JSON-lines event log and Quick Test;
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

## What is open

[BACKLOG.md](BACKLOG.md) part one; summary in [OPEN.md](OPEN.md).

## Needs the owner's word

- Whether the show is fun (the P1 gate), after playing it.
- The proposals of CONCEPT §14:
  - the five reveal steps, moved by the moderator only;
  - the artifact names and order;
  - Fredoka as the stage font;
  - the defaults N = 24 and W = 3.
- The kit tag: v0.5.0 is pinned, the newest at bootstrap, where the concept named v0.4.1
  (DECISIONS D15). Keep it or step back.
- The choices of the night recorded in [NIGHT-RUN.md](NIGHT-RUN.md) "Choices made without the
  owner", among them the separate "Start show" step after sealing.
- `e2e` as a required check of master (BACKLOG 22).
- The stage's motion (piece 2 of SC-N2, `apps/web/src/stage/motion.ts`), proposals by the
  chain's decision rule: the travel to the front and back 0.8 s ease-in-out, the opening 1.6 s
  (lid in the first 45 %, the artifact from 40 %, the meaning from 80 %), the closing before the
  way home 0.3 s.
- The ceremony's pace and order (piece 3 of SC-N2): one winner every 2.5 s, from the lowest
  prize up to the main prize, then "See the result".
- Website mode's two rules (piece 4 of SC-N2): the rank is the number of the member's valid
  Discord steps, at most 5; the steps' icons are the badges beside the name on the stage, the
  board and the header.
- The website's side for the slug `cases` (BACKLOG 27): it lives in the website repository.
- A write right for a sibling clone of this repository (for example
  `C:\Users\weudl\seasonal-cases-2`) would let future night chains run independent pieces in
  parallel; tonight's permissions cover this folder only.

## Needs the owner's hand

- The Renovate app for the new repository: no onboarding PR appeared during SC-N1.
