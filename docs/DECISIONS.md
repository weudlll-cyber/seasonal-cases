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
  Replaced by D19.
- **D15 — The kit tag.** `@seasonal/kit` is pinned to `v0.5.0` (commit `929c997`), the newest tag
  at bootstrap on 2026-11-21. The concept named v0.4.1; v0.5.0 was cut the same day and adds only
  `StartCard`, `ResultFrame` and `frames.css` (kit CHANGELOG). React and react-dom 19.3.1 as the
  kit's peer pin, Vite 8.3.4 as its optional peer. Replaced by D18.
- **D16 — Ports.** Server 3970 (127.0.0.1), client 5470 (0.0.0.0, for the phone over the LAN) for
  the game and `/admin`; the browser tests' own server 3980 and client 5480 (CONCEPT §11).
- **D17 — Storage of the prototype.** Shows live in memory; every event is appended as one JSON
  line to `.local/data/<showId>.jsonl` (git-ignored), and the server rebuilds each show from its
  lines on start. PostgreSQL comes with the full build (CONCEPT §11). Replaced by D26.

## 2026-11-21, the owner's decisions for night chain SC-N2

- **D18 — The kit follows its newest tag.** `@seasonal/kit` is pinned to its newest tag; on
  2026-11-21 that is `v0.8.0` (commit `30ce80a`).
- **D19 — A click and three steps.** The reveal has three moderator steps after the click on a
  case: Open, Owner, Back to stage. The click brings the case to the front and the lights go
  down; the prize's meaning shows with the artifact when the case opens (CONCEPT §3.4, v1.1).
- **D20 — The scoreboard.** A scoreboard on the stage shows every artifact with its prize,
  visible to everyone from sealing on. A prize lights up when its case is open; when the next
  case is selected it is struck through, so everyone sees which prizes are taken and which are
  still open (CONCEPT §7).
- **D21 — The stage moves.** The selected case travels from its place to the front and opens
  slowly; after "Back to stage" it travels back, marked opened.
- **D22 — Start, opening, ceremony.** The game has a start page with the kit's start card, an
  opening moment on the stage before the first case, a winners' ceremony on the stage at the
  end, then the result page.
- **D23 — The website's chat, website mode now.** The chat is the website's chat only,
  embedded; website mode is built now.
- **D24 — The standalone foundation now.** Own accounts, forgotten password by e-mail, roles,
  2FA for admins, ranks assigned by admins, a lobby and "My matches" are built now. The
  development sign-in stays for the Quick Test, in development only.
- **D25 — Settings in the admin area.** Settings live in the admin area, not in code; a change
  applies to new shows.
- **D26 — PostgreSQL.** Accounts, sessions, two-factor secrets and recovery codes, ranks and the
  shows' event log live in PostgreSQL (development: ops/compose.dev.yml, port 5570); the shows
  are still rebuilt from their events on start. A sealed show's commitment secret is stored
  encrypted at rest with a server key from the environment (`SC_DATA_KEY`).

## 2026-11-22, the owner's decisions for night chain SC-N4

- **D27 — The gem turns only on show.** The main prize's gem turns only in the centre case and
  in the ceremony; in the prize list (the scoreboard) and everywhere else it is still (CONCEPT
  §7, v1.6).
- **D28 — The logo per theme.** Dark theme shows the logo's emblem without lettering, light
  theme the full logo, as the website's FormLogo does; no new artwork, the pictures stay the
  website project's (CONCEPT §7).
- **D29 — The phone menu wraps.** The phone header's menu wraps to a row of its own; nothing
  scrolls sideways, nothing is hidden (CONCEPT §7).
- **D30 — Motion as built.** The motion timings and the ceremony's pace stay as built; they are
  admin settings.
- **D31 — The website-mode rank.** In website mode the rank is the number of the member's valid
  Discord steps, at most 5; the steps' icons are the badges (CONCEPT §4, §10).
- **D32 — The ceremony reveals every prize.** The ceremony reveals every prize, found or not, as
  built (CONCEPT §3.5, v1.7).
- **D33 — The early-end question.** "End show" asks once before an early end, naming how many
  prizes are still hidden; with none hidden it ends without a question.
- **D34 — No bots in real shows; unclaimed cases.** Bots fill cases in development and in the
  Quick Test only; a real show never gets bots. Cases nobody claimed stay on the stage as
  "unclaimed" and can be opened like any other; a prize in such a case counts as not won: the
  scoreboard, the ceremony, the result, the chronicle and the member summary show it as "not
  won" (CONCEPT §3.2, §3.4, §3.5).
- **D35 — Recovery codes re-issued.** Recovery codes can be re-issued from the account page with
  the password and a current code; the enrolment window after a promotion stays.
- **D36 — Account names and a neutral registration.** Account names are Latin letters including
  diacritics, digits, `-` and `_`, 3–32 characters, with no mixing of other scripts. Registration
  answers neutrally whether or not the e-mail has an account and says the rest by mail.
- **D37 — Limits.** 20 claims a minute per player and 10 watches in 10 s per socket stay; new:
  60 requests a minute per address on claims and sign-in. Real shows get no bots (D34). The Caddy
  profile's trusted range is asked by the installer, with 172.16.0.0/12 as the default.
- **D38 — `e2e` is required.** `e2e` becomes a required check of master's protection, beside
  `verify`, `security` and `docs`.
- **D39 — Applause first.** Viewer participation starts with the applause button only; tips and
  suggestions wait (BACKLOG 10 narrowed; CONCEPT §12 P3, v1.8).
