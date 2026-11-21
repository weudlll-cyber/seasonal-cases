# Handover

The state of Seasonal Cases for a new planning chat. Updated at the end of every piece.

## What the project is

A moderated community live show for the Seasonal Entertainment community: players claim numbered
cases, the server seals an artifact into each case with a public commitment, and a moderator opens
the cases in five reveal steps. [CONCEPT.md](CONCEPT.md) v1.0 governs it; the decisions are in
[DECISIONS.md](DECISIONS.md).

## Where things stand

- **Phase:** P0 bootstrap done on `master` (night chain SC-N1, piece 1); P1 prototype in progress
  on `proto/cases-v1`.
- **Repository:** `weudlll-cyber/seasonal-cases` (public). Standards, skeleton, CI (verify,
  security, docs; CodeQL; nightly browsers), kit `v0.5.0` pinned (DECISIONS D15).
- **Morning sheet of the running chain:** [NIGHT-RUN.md](NIGHT-RUN.md).
- **On `proto/cases-v1`:** the contracts, the domain (registration with rank conflicts, sealing
  with a sha256 commitment, the five steps under one direction holder, projections that never
  hold unopened content), the use cases with the JSON-lines event log and Quick Test, and the
  server with dev sign-in, dev admin API, claim and the socket side (piece 2).

## What runs

- `pnpm verify` (format, lint, typecheck, tests) and `pnpm test:coverage`.
- `pnpm dev`: server 127.0.0.1:3970, client 0.0.0.0:5470.
- The server alone: `pnpm --filter @sc/server dev`; shows are rebuilt from `.local/data/*.jsonl`.

## What is open

[BACKLOG.md](BACKLOG.md) part one; summary in [OPEN.md](OPEN.md).

## Needs the owner's word

- The proposals of CONCEPT §14: the five reveal steps, the artifact names and order, Fredoka as
  the stage font, the defaults N = 24 and W = 3.
- The kit tag: v0.5.0 is pinned, the newest at bootstrap, where the concept named v0.4.1
  (DECISIONS D15). Keep it or step back.
- The choices of the night recorded in [NIGHT-RUN.md](NIGHT-RUN.md) "Choices made without the
  owner", among them the separate "Start show" step after sealing.
- A write right for a sibling clone of this repository (for example
  `C:\Users\weudl\seasonal-cases-2`) would let future night chains run independent pieces in
  parallel; tonight's permissions cover this folder only.
