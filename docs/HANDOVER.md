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
- **Morning sheet of the chain:** [NIGHT-RUN.md](NIGHT-RUN.md). It has the final report, the
  play-through steps, every choice made without the owner, and the pictures seen and left.

## What runs

- `pnpm verify` (format, lint, typecheck, tests) and `pnpm test:coverage`.
- `pnpm dev`: server 127.0.0.1:3970, client 0.0.0.0:5470 (http://localhost:5470; the phone at
  http://192.168.0.66:5470 on the home Wi-Fi). Left running hidden for the owner at the end of
  SC-N1.
- `pnpm e2e --project=chromium`: the three journeys on their own stack (3980/5480).
- `pnpm e2e --project=screens`: the pictures at the check sizes, light and dark.
- Shows are rebuilt from `.local/data/*.jsonl` when the server starts.

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
- A write right for a sibling clone of this repository (for example
  `C:\Users\weudl\seasonal-cases-2`) would let future night chains run independent pieces in
  parallel; tonight's permissions cover this folder only.

## Needs the owner's hand

- The Renovate app for the new repository: no onboarding PR appeared during SC-N1.
