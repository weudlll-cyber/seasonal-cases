# Backlog

The authoritative list of work. Part one is open, numbered; part two is closed, with what closed
it. A piece that closes an item moves it here in the same commit and aligns [OPEN.md](OPEN.md).

## Part one — open

| #   | Item                                                                                                                            | Source                | Needs the owner       |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------- |
| 1   | Full foundation: accounts, 2FA for admins, roles, lobby                                                                         | CONCEPT §9, §12 P2    | gate: P1 is fun       |
| 2   | Website mode: sign-in through the website, rights per game, embed under `/games/cases/`                                         | CONCEPT §10           | gate: P1 is fun       |
| 3   | Chat dock and call slot (kit `DockedScreen`, `ChatDock`, `call.css`)                                                            | CONCEPT §7, §10       | gate: P1 is fun       |
| 4   | Ranks from the website (website mode) and the manual ranks admin (standalone)                                                   | CONCEPT §4            | gate: P1 is fun       |
| 5   | PostgreSQL in place of the in-memory store and the event-log files                                                              | CONCEPT §11           | gate: P1 is fun       |
| 6   | The settings catalogue in the admin area (`packages/contracts`), with descriptions and min/max                                  | CONCEPT §9, CLAUDE.md | gate: P1 is fun       |
| 7   | Sound: applause, drum-roll, cheers, countdown                                                                                   | CONCEPT §7, §12 P3    | gate: the show is fun |
| 8   | Chronicle: past shows with winners and prizes                                                                                   | CONCEPT §3.5, §12 P3  | no                    |
| 9   | "My matches": a player's shows and cases                                                                                        | CONCEPT §3.5, §12 P3  | no                    |
| 10  | Viewer participation: applause button, tips on the main-prize owner, next-case suggestions                                      | CONCEPT §12 P3        | yes                   |
| 11  | Installer: one call on a VPS for both modes                                                                                     | CONCEPT §10, §12 P4   | gate: P3              |
| 12  | Firefox/WebKit findings of the nightly browsers run                                                                             | CLAUDE.md             | no                    |
| 13  | Kit adoption items: pieces built under `packages/ui/src/pending/` until the kit has them                                        | CLAUDE.md "The kit"   | kit release           |
| 15  | P1: the client: lobby, registration board, stage with the five steps, direction bar, result, dev admin                          | CONCEPT §7, §12 P1    | no                    |
| 16  | P1: the browser journeys, the screenshots at the check sizes, the hand-over to the owner                                        | CONCEPT §7, §12 P1    | no                    |
| 17  | The sealed assignment encrypted at rest: the prototype keeps it in plain JSON in the server-only event log under `.local/data/` | CONCEPT §3.3          | with BACKLOG 5        |
| 18  | Sessions survive a server restart: the prototype draws a new cookie secret per start unless `SC_COOKIE_SECRET` is set           | CONCEPT §10           | with BACKLOG 1        |

## Part two — closed

| #   | Item                                                                           | Closed by                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14  | P1: contracts, the show's domain rules with sealing and commitment, the server | Night chain SC-N1 piece 2 on `proto/cases-v1`: `packages/contracts`, `packages/domain` (fold, registration, sealing, live, projections), `packages/application` (use cases, JSON-lines log, Quick Test), `apps/server` (dev sign-in, dev admin API, claim, socket projections and direction) |

## Checks run

Recorded so nothing is done twice.

| Date       | Check                                                                                           | Tree                      | Result                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| 2026-11-21 | `pnpm verify`                                                                                   | master, kit pin commit    | green: 7 files, 11 tests                                                         |
| 2026-11-21 | `pnpm verify`                                                                                   | `proto/cases-v1`, piece 2 | green: 14 files, 62 tests                                                        |
| 2026-11-21 | `pnpm test:coverage`                                                                            | `proto/cases-v1`, piece 2 | domain 94.4 % branches, 99.5 % lines; application 86.4 % branches                |
| 2026-11-21 | Sabotage probes (a) rank priority removed, (b) redaction removed, (c) logged assignment altered | `proto/cases-v1`, piece 2 | (a) 3 tests red, (b) "never leaks" red, (c) `verified: false`; (a), (b) restored |
