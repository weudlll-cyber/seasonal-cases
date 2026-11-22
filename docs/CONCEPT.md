# Seasonal Cases — Concept

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-21 | First concept, from the owner's project vision and his answers of 2026-11-21. |
| 1.1 | 2026-11-21 | Night chain SC-N2, from the owner's decisions of 2026-11-21: three moderator steps after the click on a case (§3.4); the scoreboard and the meaning shown at Open (§7). |
| 1.2 | 2026-11-21 | Night chain SC-N2: the moving case (§7). |
| 1.3 | 2026-11-21 | Night chain SC-N2: the opening and the ceremony (§3.4, §3.5), the result frame (§3.5), the start page and focus mode (§7). |
| 1.4 | 2026-11-21 | Night chain SC-N2: website mode as built, the organiser role, the rank and badges in website mode (§10). |
| 1.5 | 2026-11-22 | Night chain SC-N3: the phases' status (§12); nothing else changes. |
| 1.6 | 2026-11-22 | Night chain SC-N4, from the owner's decisions of 2026-11-22: the website-mode rank rule decided (§4, §10); the logo per theme, the phone menu, the still gem outside the centre and the ceremony (§7). |

This document is the single valid concept. Every revision replaces it whole and adds a row above.
Decisions in it are facts with a date; proposals are marked as proposals until the owner confirms them.

---

## 1. What Seasonal Cases is

Seasonal Cases is a **moderated community live show** for the Seasonal Entertainment community.
It is not a game show clone, not a lottery and not an action game. The show exists so that the
community meets regularly and every case opening is a small show moment.

The tension comes from the reveals, not from the cases: *Which case is next? What is inside? Does
that content carry a prize? Whose case is it?*

Rule for the whole project (decided 2026-11-21): **no unnecessary game mechanics.** The system
amplifies what already creates tension — unknown contents, the moderators, the community, the
winner reveals — and never covers it up. There is no banker, no deal, no trading, no points, no
decision a player has to make during the show.

The show follows the ecosystem's principles (start document, 2026-11-21): nothing of monetary
value is won inside the game; the website carries the "no financial advice" note; the moderators
are part of the show and are never replaced or automated.

## 2. Roles

| Role | What they do |
|---|---|
| **Viewer** | Anyone, signed in or not. Watches the stage, sees the found prizes and the chronicle. In website mode uses the website's chat. |
| **Player** | Signed-in account that registered for a show and holds a case. Does exactly two things: register and pick a case. Then watches. |
| **Moderator** | Leads the show live. Picks the next case, triggers each reveal step, talks to the community (voice via the website's call, text via the chat). Several moderators may be signed in; **exactly one holds the direction** at any time and can hand it over (decided 2026-11-21). |
| **Organiser / Host** | Creates a show, sets the number of cases and the number of winners, opens and closes registration, seals the show, names the first moderator. In website mode: everyone with the website right "may start games" for this game. |
| **Admin** | Everything, in sections. A website admin is automatically an admin in the game. Standalone mode: admins also assign the players' ranks by hand (decided 2026-11-21). |

The moderator sees the same stage as everyone plus a narrow **direction bar**. A player sees exactly
what every other player sees; direction functions are separate from the player view.

## 3. The life of a show

```
SETUP → REGISTRATION → SEALED → LIVE → ENDED
```

### 3.1 Setup (organiser)
- Number of cases **N** and number of winners **W** (W ≤ N). Both are chosen per show before it
  starts (decided 2026-11-21). Defaults are settings (proposal: N = 24, W = 3).
- Prize slots 1…W. Each slot has an optional label (free text, e.g. "Prize 1"). Prizes are managed
  outside the game; the game only shows the labels (decided 2026-11-21). Labels may be empty when
  the prizes are not yet known; the show then says "Prize 1", "Prize 2", …
- The artifact table: which artifact stands for which prize slot, and which artifact means "no
  prize" (§6). It is shown to everyone from registration on.

### 3.2 Registration (players)
- A signed-in player registers for the show and picks a case by number.
- Several players may pick the same case. The case goes to the player with the **highest Seasonal
  rank**; with equal rank, to the one who **picked first** (decided 2026-11-21).
- While registration is open, a player sees for every case who currently holds the claim and whether
  their own rank is higher. They may change their pick at any time (decided 2026-11-21).
- When registration closes, each case belongs to its winning claimant. Players who end up without a
  case are out of luck and become viewers (decided 2026-11-21).
- Guests may watch the registration board but cannot register (ecosystem rule).

### 3.3 Sealing (organiser)
- The server draws the contents: W prize artifacts and N − W blank artifacts, shuffled over the N
  cases with the server's secure random source, or from a seed in test mode.
- The assignment is stored encrypted. **Nobody knows it**: not the players, not the moderators, not
  the organiser (decided 2026-11-21).
- The server publishes a **commitment**: a hash over the sealed assignment and a server secret.
  After the show the secret is revealed, so anyone can check that no case was changed during the
  show (fairness, §8).
- From sealing on, the stage shows: all cases with their owners' names and badges, the artifact
  table, and the scoreboard (§7).

### 3.4 Live (moderator)
**The opening** (decided 2026-11-21): after "Start show" the stage shows the opening for everyone:
the show's title, the number of cases and prizes, the artifact table, and the cases with their
owners rolling in. Only the direction holder sees **Begin**; until then no case can be selected.

The moderator opens cases one at a time, in any order. Only the moderator moves the show; no
timer does (decided 2026-11-21). A case takes a click and three steps:

- **The click on a case** — the case comes to the front and the lights go down; the other cases
  dim. The moderator talks as long as they want.
- **Open** — the case opens; the artifact appears in its season colour, and its meaning with it:
  "Prize 1 · <label>", "Prize 1" when the slot has no label, or "No prize".
- **Owner** — the lower third shows the owner's name and Discord badge; confetti on the main
  prize.
- **Back to stage** — the case returns to the stage as "opened".

Between any two steps the moderator can talk as long as they want. A choice can be changed only
before "Open" (click another case); after "Open" the content is public and stays public.

The direction bar also offers **hand over direction** to another signed-in moderator and **end the
show**.

### 3.5 Ended
- The show ends when the moderator ends it. The game offers "End show" once the last prize has been
  found, but opening the remaining cases is allowed (decided 2026-11-21).
- **The ceremony** (decided 2026-11-21): after "End show" the stage shows the winners one after
  another, from the lowest prize up to the main prize, each with its artifact and the lower
  third, confetti on the main prize; then "See the result". The pace (2.5 s per winner) is a
  proposal.
- The result page, on the kit's result frame, lists the winners (prize slot, label, artifact,
  owner) as its placings, every case as its reveal, and all cases with their owners below.
- The server reveals the sealing secret; the result screen shows "sealed at <time>, verified".
- The show goes into the **chronicle**: past shows with winners and prizes. There is no ranking
  (decided 2026-11-21). A player's "My matches" lists their shows and cases.

## 4. The Seasonal rank

- **Website mode:** the rank is the number of the member's valid Discord steps as the website
  reports them, at most 5, and the steps' icons are the badges beside the name (decided
  2026-11-22).
- **Standalone mode:** admins assign each account's rank by hand in the admin area (decided
  2026-11-21). Unassigned accounts have the lowest rank.
- The rank decides only case conflicts (§3.2). It has no other effect.

## 5. Prizes

Prizes are handled outside the game. The game knows a prize only as a slot number and an optional
label (decided 2026-11-21). The game never pays out, transfers or promises anything. The website's
"no financial advice" note applies.

## 6. Artifacts instead of numbers

Every case contains an **artifact**, never a number (decided 2026-11-21; the owner's examples are
adopted as the proposal below). Before the show, the table says which artifact means which prize.

| Slot | Artifact (proposal) | Season colour |
|---|---|---|
| 1 (main prize) | Halving Stone | all four, rotating glow |
| 2 | Season Key | Autumn `#F9A825` |
| 3 | Winter Crystal | Winter `#04AAF7` |
| 4 | Spring Seed | Spring `#AFB84E` |
| 5 | Summer Flame | Summer `#E06E22` |
| 6 | Ancient Leaf | Autumn `#F9A825` |
| 7… | Relic #n | the current season |
| no prize | Fallen Leaf | muted, the current season |

Artifact names and their order are settings, not code (§9). The halving is the ecosystem's high
point, so the main prize is the Halving Stone.

## 7. The stage (look and feel)

Target: a TV-studio feel with small means — SVG, icons, gradients, glow, CSS animation, no 3D.

- **Start page** (decided 2026-11-21): the game's name and the Seasonal Entertainment logo (the
  full logo in light theme, its emblem without lettering in dark, as the website's forms show it;
  decided 2026-11-22), the
  current or next show on the kit's start card (state, cases, prizes; "Opens in N s" once shows
  have a start time), its registration board below while registration is open, and the sign-in
  where it belongs.
- **Header on a phone** (decided 2026-11-22): the menu's links wrap to a row of their own;
  nothing scrolls sideways and nothing is hidden.
- **Focus mode:** during a live show the kit's game bar replaces the app header: "Seasonal
  Cases", the cases left and the prizes left, full screen where offered, and panels for the
  players (the owners), the chat (website mode) and, for the direction holder on a phone, the
  direction. On a desktop the direction bar stays under the stage.

- **Stage:** the cases in a half circle (two rows on a phone), each with its number, its owner's name
  and a soft season glow. The selected case moves large into the centre; the rest dims.
- **Light:** a spotlight cone and glow on the selected case; the background keeps the website's
  night blue (dark) or cream white (light) with the four season shimmers, never flat black or white.
- **Scoreboard** (decided 2026-11-21): above the stage, every artifact with its prize, visible to
  everyone from sealing on. A prize lights up when its case opens; once the next case is selected
  it is struck through with its owner's name, so everyone sees which prizes are taken and which
  are still open. The commitment stays visible beside it.
- **Open:** the artifact appears with its meaning under it (§3.4).
- **The moving case** (decided 2026-11-21): after the click the case travels from its place on the
  half circle to the front in one continuous motion while the others dim; at Open its lid lifts
  slowly, the artifact rises with its glow and the meaning appears last. After Back to stage it
  closes, travels home and stays there marked opened (durations: settings, §9).
- **Lower third:** owner's name and Discord badge at the "Owner" step.
- **Confetti** only on the main prize.
- **The main prize's gem** (the four seasons) turns only in the centre case and in the ceremony;
  in the scoreboard and everywhere else it is still (decided 2026-11-22).
- **Fonts:** Luxora Grotesk from the kit for the frame (Book for text, Bold for headings). The stage
  may use a playful show font for case numbers and artifact names (decided 2026-11-21); proposal:
  Fredoka, as Seasonal Party uses it.
- **Colours** only from the kit's tokens; the season colours exactly as the website's.
- **Light and dark** are both required and equal.
- **Sound** (applause, drum-roll, cheers, countdown) comes last, after the owner has judged the
  show to be fun; the prototype is silent (ecosystem rule).
- **Fit to the screen** as in the start document §6: the stage screens (registration board, live
  stage, result) scale down evenly where there is no room, never up; **floor 14 px** text (decided
  2026-11-21); below the floor a named scroll area takes the rest. Normal pages (lobby, chronicle,
  admin) scroll. On the PC the chat dock sits at the bottom in the kit's sizes; on a phone the
  kit's chat bar. The call slot is reserved in the kit's sizes and hidden while no call is linked.
- **Check sizes** (CC, light and dark): PC 1280×720, 1366×768, 1536×768, 1440×900, 1900×860,
  1920×1080; phone 375×667, 360×780, 390×844, 430×932.
- **Tooltips** on every input and icon button.
- The UI is English; dates uniform, each viewer in their own time zone.

## 8. Fairness and verifiability

- The assignment is drawn server-side with a secure random source (never `Math.random`), stored
  encrypted, committed by hash before the show, revealed after it (§3.3). The show's event log is
  append-only and reproducible from the seed in test mode.
- The client never receives a case's content before the moderator's "Open" step for that case.
- No speed matters anywhere: registration conflicts are decided by rank and pick time, not by
  clicking fast during the show.
- A moderator's action is confirmed by the server within 5 seconds (ecosystem rule); the show is
  event-driven, not a fixed tick.

## 9. Settings (admin area, part of the game)

Everything adjustable without touching code (ecosystem rule), each value with a description,
min/max where technically needed and a warning on delicate values. Changes apply to new shows only.

Proposed catalogue for the full build: default N and W; min/max N; artifact names and order; the
blank artifact name; step animation durations; confetti on/off; whether registration shows the
current claimants (default: yes, decided 2026-11-21); chronicle length; rank source (website /
manual).

**Prototype:** a simple development admin with N, W, prize labels, Quick Test seed, and bots to
fill the cases, until the owner says the show is fun. Then the full foundation follows (accounts,
admin with 2FA, host, lobby, website sign-in).

## 10. Two modes of operation

Both are required (ecosystem principle, confirmed for this game 2026-11-21).

- **Embedded** under `https://stentertainment.net/games/cases/`: sign-in only through the website
  (GAME-INTEGRATION §2–§4, AUTH.md), rights per game, website admins are game admins, guests watch,
  the website's chat embedded (room `cases`), the call slot reserved, the "← Seasonal Entertainment"
  link top left, deleted accounts shown as "deleted player" plus short id.
- **Standalone:** own accounts (register, sign in, forgotten password by e-mail), 2FA for admins,
  roles player / organiser / admin, super admin by server command, manual ranks (§4), no website
  link, no chat and no call.
- **Installer:** one call on a VPS for both modes, asking what it needs; general instructions.

**What exists (night chain SC-N2):** website mode under `/games/cases/` with the website's
sign-in route and its login hop, accounts keyed by (website origin, website user id), a website
admin as game admin, a host of this game as organiser, everyone else as player, guests who watch
and cannot register, the account-changes feed (a lock or a rights change ends the game sessions; a
deletion shows "deleted player" plus the short id), 7-day game sessions, the website's chat
docked under every screen (room `cases`), the call slot reserved and hidden, and the
"← Seasonal Entertainment" link. The rank in website mode is the number of the member's valid
Discord steps, at most 5, and the steps' icons are the badges beside the name (§4, decided
2026-11-22). The role formerly called "moderator" is the **organiser**: they create shows, hold
the direction and hand it to any signed-in organiser or admin.

The **development sign-in** (name, role and rank, no password) stays in local mode with
`NODE_ENV=development` and `SC_DEV=1`, so the owner can run the Quick Test and play as a player in
one tab and hold the direction in another (decided 2026-11-21).

## 11. Technology

Same stack as Mini Games and Seasonal Party: pnpm workspace, TypeScript, Fastify + socket.io on the
server, React 19 + Vite on the client, Vitest, Playwright (Chromium at merge, Firefox/WebKit nightly),
ESLint, Prettier, lefthook. Layers as in Mini Games: `domain` (no I/O, no clock, no randomness except
injected ports) ← `application` ← `apps/server`; the client renders, the server decides.

- **Kit:** `@seasonal/kit` pinned to the newest tag at bootstrap (v0.4.1 on 2026-11-21): tokens,
  fonts, motion, theme, fit floors, `DockedScreen`, `ChatDock`, `BackLink`, `ThemeToggle`, website
  sign-in helpers, chat embed, call slot. A game switches kit version only on the owner's word.
  Nothing the kit has is rebuilt in the game.
- **Ports (local):** server **3970**; one client address **5470** for the game and `/admin`,
  reachable from the phone over the LAN; browser tests' own server **3980** and client **5480**.
  All other Seasonal ports are off-limits (Mini Games spec 10 §4).
- **Storage, prototype:** state in memory plus an append-only event log file under a git-ignored
  `.local/` folder — enough for seeds, the commitment and the result screen. **Full build:**
  PostgreSQL as in Mini Games.
- **Realtime:** event-driven over socket.io; no fixed tick.
- **Security from day one:** CodeQL, osv-scanner, gitleaks (CI and pre-commit), Renovate grouped
  without auto-merge, read-only workflow permissions, actions pinned to full SHAs, exact versions,
  lockfile committed, master protected (PR with green required checks, no force-push, no deletion).
- **Licence:** AGPL-3.0-or-later; font, logo and season icons belong to the Seasonal Tokens project
  and are not under the AGPL.

## 12. Phases

| Phase | Content | Gate | Status (2026-11-22) |
|---|---|---|---|
| **P0 Bootstrap** | Repository, standards, CI, protection, kit pinned, docs skeleton. | CI green on master. | Done (on master). |
| **P1 Prototype** | Development sign-in, dev admin, registration board with case conflicts, sealing with commitment, the live stage with the reveal steps, direction bar with hand-over, result screen, bots, Quick Test seed, light/dark, fit to the check sizes. Silent. | The owner plays it and says it is fun. | Built on `proto/cases-v1`; the gate waits for the owner. |
| **P2 Foundation** | Accounts, 2FA, roles, lobby, website mode, chat dock, call slot, ranks (website / manual), PostgreSQL, admin area with the settings catalogue. | Owner's acceptance. | Built on `proto/cases-v1`; the call slot stays hidden (no call yet). |
| **P3 Show polish** | Sound, chronicle, "My matches", viewer participation (applause button, tips on the main-prize owner, next-case suggestions), seasonal theming of the stage. | Owner's acceptance per item. | Built except viewer participation (BACKLOG 10, the owner's word). |
| **P4 Release** | Installer, security review, first show on the VPS. | Security pass green. | Installer and two security reviews built; release candidate 1.0.0-rc.1; the first show on the VPS waits for the merge. |

## 13. Deliberately not built

No banker, no deal, no trading, no points, no player decisions during the show, no own chat, no
sound before P3, no viewer polls before P3, no rankings, no payout of anything.

## 14. Needs the owner's word (v1.1)

- Artifact names and order (§6): the owner's examples, in the proposed order.
- Fredoka as the stage font (§7).
- Defaults N = 24, W = 3 (§3.1).
