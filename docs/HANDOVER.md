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

## What runs

- `pnpm verify` (format, lint, typecheck, tests) and `pnpm test:coverage`.
- `pnpm dev`: server 127.0.0.1:3970, client 0.0.0.0:5470.

## What is open

[BACKLOG.md](BACKLOG.md) part one; summary in [OPEN.md](OPEN.md).

## Needs the owner's word

- The proposals of CONCEPT §14: the five reveal steps, the artifact names and order, Fredoka as
  the stage font, the defaults N = 24 and W = 3.
- The kit tag: v0.5.0 is pinned, the newest at bootstrap, where the concept named v0.4.1
  (DECISIONS D15). Keep it or step back.
- A write right for a sibling clone of this repository (for example
  `C:\Users\weudl\seasonal-cases-2`) would let future night chains run independent pieces in
  parallel; tonight's permissions cover this folder only.
