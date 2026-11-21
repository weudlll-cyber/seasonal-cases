# Decisions

The decisions that govern Seasonal Cases, as dated facts. Only the owner makes them; a change to
one is a new dated entry here, in the same commit as the work it governs ([CLAUDE.md](../CLAUDE.md)).
Proposals are listed in [CONCEPT.md](CONCEPT.md) §14 and in [HANDOVER.md](HANDOVER.md) until the
owner confirms them.

## 2026-11-21

- **D1 — No unnecessary game mechanics.** The system amplifies what already creates tension and
  never covers it up: no banker, no deal, no trading, no points, no decision a player makes
  during the show (CONCEPT §1, §13).
- **D2 — One direction holder.** Several moderators may be signed in; exactly one holds the
  direction at any time and can hand it over to another signed-in moderator (CONCEPT §2).
- **D3 — Cases and winners per show.** The number of cases N and of winners W (W ≤ N) are chosen
  per show before it starts (CONCEPT §3.1). The prototype allows 2 ≤ N ≤ 99 and 1 ≤ W ≤ N
  (night chain SC-N1).
- **D4 — Prizes are labels.** Prizes are managed outside the game; the game knows a prize as a
  slot number and an optional label, shown as "Prize n" while empty. It never pays out, transfers
  or promises anything (CONCEPT §3.1, §5).
- **D5 — Case conflicts.** Several players may pick the same case. It goes to the highest
  Seasonal rank; with equal rank, to the earliest pick. A player may change their pick while
  registration is open and sees who holds each case and whether their own rank is higher. Players
  without a case at the close become viewers (CONCEPT §3.2). Registration shows the current
  claimants (CONCEPT §9).
- **D6 — Nobody knows the contents.** The server draws the assignment; no player, moderator or
  organiser knows it. A commitment is published at sealing and the secret revealed after the show
  (CONCEPT §3.3, §8).
- **D7 — The dock's height stays free.** At PC sizes the stage screens (registration board,
  stage, result) keep the kit's dock height free at the bottom (190 px, 150 px under 760 px high;
  the kit's `CALL_SLOT` constants), so the chat dock fits later without a re-layout (night chain
  SC-N1, piece 3).
- **D8 — The moderator ends the show.** "End show" is offered once the last prize has been
  found; opening the remaining cases is still allowed (CONCEPT §3.5).
- **D9 — No ranking.** Past shows go into a chronicle with winners and prizes; there is no
  ranking (CONCEPT §3.5).
- **D10 — The rank's source.** Website mode: the account's Discord tier as the website reports
  it. Standalone mode: admins assign each rank by hand; unassigned accounts have the lowest rank.
  The rank decides only case conflicts (CONCEPT §4).
- **D11 — Artifacts, not numbers.** Every case contains an artifact; a table shown from
  registration on says which artifact means which prize slot and which means no prize. Names and
  order are settings, not code (CONCEPT §6).
- **D12 — The stage's look.** The stage may use a playful show font for case numbers and artifact
  names; text never goes below 14 px (CONCEPT §7).
- **D13 — Two modes.** Embedded in the website and standalone are both required (CONCEPT §10).
- **D14 — Five steps, moved by the moderator.** A case opens in the five steps select, tension,
  open, prize, owner, each triggered only by the direction holder; no timer moves the show. Built
  for the owner's judgement in play; confirm or change in concept v1.1 (CONCEPT §3.4, §14).
- **D15 — The kit tag.** `@seasonal/kit` is pinned to `v0.5.0` (commit `929c997`), the newest tag
  at bootstrap on 2026-11-21. The concept named v0.4.1; v0.5.0 was cut the same day and adds only
  `StartCard`, `ResultFrame` and `frames.css` (kit CHANGELOG). React and react-dom 19.3.1 as the
  kit's peer pin, Vite 8.3.4 as its optional peer.
- **D16 — Ports.** Server 3970 (127.0.0.1), client 5470 (0.0.0.0, for the phone over the LAN) for
  the game and `/admin`; the browser tests' own server 3980 and client 5480 (CONCEPT §11).
- **D17 — Storage of the prototype.** Shows live in memory; every event is appended as one JSON
  line to `.local/data/<showId>.jsonl` (git-ignored), and the server rebuilds each show from its
  lines on start. PostgreSQL comes with the full build (CONCEPT §11).
