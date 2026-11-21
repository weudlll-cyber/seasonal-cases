# Night runs

The morning sheets of the unattended night chains, newest first.

## Night chain SC-N2 (2026-11-21)

Kit v0.8.0, three steps, scoreboard, the moving case, start and finale, website mode with the
chat, standalone accounts with 2FA, settings, chronicle. Branch `proto/cases-v1`, continued;
nothing merged.

### Final report

Written when the chain ends.

### Pieces

| Piece                                                     | Done | Running | Open | Needs the owner's word   | Commits            | CI run ids           |
| --------------------------------------------------------- | ---- | ------- | ---- | ------------------------ | ------------------ | -------------------- |
| 1 Kit v0.8.0, fixes A and B, three steps, scoreboard      | all  | —       | —    | —                        | `c36b3e1`          | CI 44885929803 green |
| 2 The moving case                                         | all  | —       | —    | the durations (HANDOVER) | see piece 2 report | see piece 3 row      |
| 3 Start page, opening, focus mode, ceremony, result frame | —    | —       | all  | —                        | —                  | —                    |
| 4 Website mode                                            | —    | —       | all  | —                        | —                  | —                    |
| 5 PostgreSQL and the accounts store                       | —    | —       | all  | —                        | —                  | —                    |
| 6 Standalone accounts                                     | —    | —       | all  | —                        | —                  | —                    |
| 7 2FA and the independent review                          | —    | —       | all  | —                        | —                  | —                    |
| 8 Settings, season tint, polish                           | —    | —       | all  | —                        | —                  | —                    |
| 9 Chronicle                                               | —    | —       | all  | —                        | —                  | —                    |
| 10 Play-through, pictures, hand-over                      | —    | —       | all  | —                        | —                  | —                    |

### Piece 1 report

- **Kit:** `v0.8.0` (commit `30ce80a`) pinned in `packages/ui` and `apps/web` (DECISIONS D18).
  Migration notes 0.5.0 → 0.8.0 that concern a game like this one: `.sk-visually-hidden` now in
  `shell.css` (imported already); the phone root height `var(--sk-visible-height)` applies once
  the screens sit in `DockedScreen` (piece 4). The kit still has no `cases` fit floors and still
  reserves the dock only with a chat, so `pending/fit-cases.css` and `pending/useDockReserve.ts`
  stay (BACKLOG 19, 20). The kit test proves `@seasonal/kit`, `@seasonal/kit/react`,
  `@seasonal/kit/server` and the CSS entries, `bar.css`, `dock.css` and `frames.css` included.
- **Fix A:** `currentShow` follows live → sealed → registration → setup → ended, newest
  first within each (`apps/server/src/showRoutes.ts`). Shows made in the same millisecond keep
  their creation order (`packages/application/src/shows.ts`). The client's `useCurrentShow`
  has a `refresh`. The admin asks for the current show after Quick Test and Create, before it
  navigates. The feed empties its views when the show id changes (`apps/web/src/lib/feed.ts`).
  Tests: `routes.test.ts` "the current show" and `lib/feed.test.tsx`.
- **Fix B:** the direction bar exists only while the show is live; after the end only "See the
  result" stays (`Stage.tsx`, test "is gone once the show has ended").
- **Three steps:**
  - `RevealStep` is `idle | selected | open | owner`; the direction's steps are `open`,
    `owner` and `return`;
  - removed from contracts, domain, server tests, stage, component tests and the journeys;
  - a logged step the show no longer knows folds as a no-op (`model.ts`, its header says so;
    test "folds a logged step the show no longer knows");
  - the found prizes count from Open;
  - the public view's `found` and `stillHidden` are gone with the top bar that read them;
    `allPrizesFound` stays.
- **The centre case at Open:** the artifact and under it "Prize 1 · Gold", "Prize 2" without a
  label, or "No prize" (`CentreStage.tsx`).
- **Scoreboard** (`stage/Scoreboard.tsx`, `stage/scoreboard.css`):
  - it replaces the top bar (`TopBar.tsx` deleted), with one row per prize, then the blank;
  - states open, lit and taken, computed only from the public view;
  - one line per row on a phone;
  - the commitment beside it;
  - test `Scoreboard.test.tsx`.
- **Base path ready:** every client API call, page link and the socket path go through
  `lib/base.ts` (Vite's base), the groundwork for website mode (piece 4).
- **Docs:** CONCEPT v1.1 (§3.4 the click and three steps, §7 the scoreboard and the meaning at
  Open, §14 without the decided steps), DECISIONS D18–D25, README.
- **Tests:** `pnpm verify` green (17 files, 89 tests before the feed test; 18 files, 91 with
  it); journeys 1–3 passed in Chromium.
- **Left alone:** the SC-N1 section below keeps the five steps as that night's record.

### Piece 2 report

- **The travel** (`stage/travel.ts`):
  - after the click the front case is drawn at the front, then placed onto its place on the
    half circle with an inverse transform (start and end rectangles measured), and a CSS
    transition takes it to the front, 0.8 s ease-in-out;
  - the case's place keeps its room but hides the case (`is-away`), so it never shows twice
    and never fades out and in;
  - after Back to stage, `useReturn` keeps the case at the front while it closes (0.3 s), then
    it travels home;
  - a new selection ends any travel at once, and a click during a motion is sent at once.
- **The slow opening** (`stage/front.css`, 1.6 s): the lid rises in the first 45 %, the glow
  grows under it, the artifact emerges from 40 %, the meaning fades in from 80 %. The artifact is
  drawn only when the view carries it.
- **One settings object** (`stage/motion.ts`): every duration, as the CSS variables
  `--travel-ms`, `--travel-ease`, `--open-ms`, `--close-ms` on the stage. Under reduced motion
  the kit's motion.css turns every transition and animation off, and `motionMs` answers 0, so
  the stage shows end states at once.
- **Removed:** the drum-roll shake at the click and the centre's fade-in (the travel replaces
  them); the front case's rules moved from `stage.css` to `front.css`.
- **Tests:** `stage/motion.test.tsx` covers:
  - the settings and their CSS variables;
  - the inverse transform;
  - the way home, with a new selection ending it;
  - no artifact while the view has none.

  Journey 1 checks that the case's box at the front differs from its box at its place (moved
  more than 20 px, wider), and that neither artifact nor meaning shows before Open. `pnpm
verify` green (19 files, 95 tests); journey 1 passed.

### Choices made without the owner (SC-N2)

- **The budget rule's piece numbers** do not all match the piece headings. It names "piece 5
  (website mode)", "piece 7 the forgotten-password mail" and "piece 4 the ceremony's animation";
  in the headings these are pieces 4, 6 and 3. The chain follows the rule by content.
- **The blank row of the scoreboard** lights while a blank is open at the front and is never
  struck through: there are many blanks, and one taken blank says nothing.
- **The scoreboard's wording:** "Prize 1: Gold" or "Prize 2" (the existing `prizeTitle`); the
  centre case uses "Prize 1 · Gold" as the task writes it.

## Night chain SC-N1 (2026-11-21)

Repository, standards and the playable prototype. Branch of the prototype: `proto/cases-v1`
(nothing merged; the owner looks at the branch first).

### Final report

**Done.** All four pieces. Piece 1 on `master`, protected, CI green. Pieces 2–4 on
`proto/cases-v1`, pushed, nothing merged:

- the rules with sealing and commitment, the use cases and the server (piece 2);
- the client (piece 3);
- the three browser journeys, 80 pictures, and the fixes they showed (piece 4).

`pnpm verify` is green (16 files, 81 tests). The three journeys pass once in Chromium. CI of the
last code push (`0557458`): run 44859913784, green: verify, security, docs, and e2e with all three
journeys passing (18 s). This docs-only follow-up has its own run, listed by
`gh run list --branch proto/cases-v1`.

**What runs now.** Server 127.0.0.1:3970 and client 0.0.0.0:5470 run hidden in the background on
`proto/cases-v1`.

- **On this PC:** http://localhost:5470
- **On the phone (same Wi-Fi):** http://192.168.0.66:5470. Windows may ask once whether Node.js
  may accept connections on private networks; allow it for the phone to reach the client.
- **Sign-in names (development sign-in, no password):**
  - a moderator: any name with role `moderator`, or `admin` (who can also use `/admin`);
  - a player: any name with role `player` and a rank from 0 to 5.
- **Quick Test seed:** `sc-n1-01`.

**One two-tab play-through.** One sign-in per browser window: the second person goes in a
private window, or another browser.

1. **Window A:** open http://localhost:5470, sign in as `Mia`, role `admin`. Open **Admin**
   (`/admin`).
2. **Window B (private):** open http://localhost:5470, sign in as `Ana`, role `player`, rank `3`.
3. **A, Admin:** keep Cases 24 and Winners 3, type a label for prize 1 if you like, and click
   **Create show**. Under "Shows", click **Open registration** on the new show.
4. **B, Lobby:** the registration board appears. Click a case to pick it. "Your pick: case n,
   you hold it" appears.
5. **A, Admin:** click, on the same show:
   1. **Fill with bots**;
   2. **Close**;
   3. **Seal** (the commitment now shows on the lobby's artifact table);
   4. **Start show**.
6. **A:** open **Stage**; the direction bar is at the bottom. **B:** open **Stage**; no bar,
   the same stage.
7. **A:** click a case (it moves to the centre), then **Tension**, **Open**, **Prize**,
   **Owner** and **Back to stage**. B sees every step. Open Ana's case too: the lower third names
   her.
8. **A:** go on until "Found" lists every prize, and **End show** lights up. Click it, then
   **See the result**: the winners, every case, and "sealed at … · commitment … · verified".

The shortcut: on `/admin` click **Quick Test** with the seed `sc-n1-01`. It makes a live show with
bots in every case and takes you to the stage with the direction.

**What is open.** BACKLOG part one, among them:

- the foundation (1–6);
- show polish (7–10);
- the sealed assignment encrypted at rest (17);
- sessions across restarts (18);
- two kit adoption items (19 floors for cases, 20 dock reserve).

**Needs the owner's word.**

- The proposals of CONCEPT §14:
  - the five reveal steps, moved by the moderator only;
  - the artifact names and order;
  - Fredoka as the stage font;
  - the defaults N = 24 and W = 3.
- The kit tag v0.5.0, where the concept named v0.4.1 (DECISIONS D15).
- The separate "Start show" step after sealing.
- Adding `e2e` to master's required checks.
- A write right for a sibling clone, so future nights can run pieces in parallel.
- Everything under "Choices made without the owner" below.

**Needs the owner's hand.** The Renovate app for the new repository (no onboarding PR by the end
of the chain).

### Pieces

| Piece                                      | Done                                                                                   | Running                             | Open                            | Needs the owner's word                        | Commits                    | CI run ids                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------- | --------------------------------------------- | -------------------------- | ---------------------------------------------- |
| 1 Repository and standards                 | standards, skeleton, CI, kit v0.5.0, docs; repository created; master protected        | —                                   | Renovate onboarding (see below) | kit tag v0.5.0 vs. the concept's v0.4.1 (D15) | master `0aee998`…`2bf720c` | CI 44850888611 green; CodeQL 44850888453 green |
| 2 Contracts, domain, server                | contracts, domain with probes, application, server with socket tests                   | —                                   | BACKLOG 17, 18 (later)          | the "Start show" step (below)                 | `proto/cases-v1` `90a40e1` | CI 44853721518 green                           |
| 3 The client                               | lobby, board, stage with five steps, direction bar, result, dev admin, component tests | —                                   | screenshots and fixes (piece 4) | Fredoka (CONCEPT §14), the phone's two rows   | `proto/cases-v1` `10b486a` | CI 44856786489 green                           |
| 4 Play-through, browser tests, screenshots | three journeys, 80 pictures, the fixes they showed, docs, hand-over                    | server 3970 and client 5470, hidden | see the final report            | see the final report                          | `proto/cases-v1` `0557458` | CI 44859913784 green (e2e included)            |

### Piece 1 report

- **Commits on master:** `0aee998` standards, `dd65fe2` skeleton, `40a8543` CI, `4b3c5c9` kit,
  `2bf720c` docs. `gh repo create` pushed them; CI run 44850888611 (verify 36 s, security 24 s,
  docs 14 s) and CodeQL run 44850888453 are green.
- **Protection:** `PUT …/branches/master/protection` accepted: required checks `verify`,
  `security`, `docs` (GitHub Actions, strict), admins included, a pull request with 0 approvals,
  no force push, no deletion, linear history not required. The browser job `e2e` (piece 4) is not
  a required check; adding it changes the protection, which needs the owner's word.
- **Reused (copied as pattern, adapted):** Mini Games' package.json scripts, pnpm-workspace.yaml,
  .npmrc, .nvmrc, the three tsconfigs, eslint.config.js with boundaries, prettier, lefthook,
  .editorconfig, .gitattributes, .gitignore (plus `.local/`), renovate.json, SECURITY.md,
  CONTRIBUTING.md, the setup action and the three workflows with their SHAs and digests. The
  kit's `scripts/gitleaks-staged.sh` (Docker answered, so the pre-commit gitleaks step is on).
  The minimatch override from the kit's pnpm-workspace.yaml.
- **Dependencies:** Mini Games' root dev tools at its versions (ESLint 10.13.0, typescript-eslint
  8.71.2, eslint-plugin-boundaries 7.2.0, eslint-import-resolver-typescript 4.4.5, Prettier
  3.9.10, TypeScript 5.9.3, Vitest 5.0.5 with coverage-v8, lefthook 2.2.2, @types/node 22.20.5);
  zod 4.6.7 (contracts); fastify 5.12.7 and tsx 4.23.15 (server); React/react-dom 19.3.1, Vite
  8.3.4, @vitejs/plugin-react 6.1.2, jsdom 30.1.3, Testing Library react 16.3.3 / dom 10.4.2
  (client); `@seasonal/kit` `github:weudlll-cyber/seasonal-kit#v0.5.0`.
- **Tests:** `pnpm verify` green, 7 files, 11 tests. The kit proof (`packages/ui/src/kit.test.ts`)
  imports `@seasonal/kit`, `@seasonal/kit/react` and reads `tokens.css`, `fonts.css`,
  `motion.css`, `fit.css`.

### Piece 2 report

- **Contracts** (`packages/contracts`, zod): show states, roles, ranks 0–5, seasons, reveal steps
  (`show.ts`); artifacts and prize slots (`artifact.ts`); the public, moderator and personal views
  and the result (`view.ts`); the HTTP shapes (`api.ts`); the socket events (`socket.ts`).
- **Domain** (`packages/domain`, pure; time and randomness arrive in the commands): events
  (`events.ts`) and their fold (`model.ts`); setup and artifact table from one settings object
  (`setup.ts`, `settings.ts`); claims, conflict view, standings, bots (`registration.ts`); seal,
  canonical JSON, sha256 commitment, `verify` (`sealing.ts`); the direction holder and the five
  steps (`live.ts`); `decide` (`commands.ts`); the projections (`projection.ts`); the seeded
  sha256 counter generator (`random.ts`).
- **Application** (`packages/application`): `createShowService` with every use case and
  `quickTest`, the in-memory and the JSON-lines stores, replay on start, the season of a date.
- **Server** (`apps/server`, Fastify 5.12.7, @fastify/cookie 11.1.3, @fastify/helmet 13.2.0,
  socket.io 4.8.4, zod 4.6.7; socket.io-client 4.8.4 for its tests): dev sign-in with a signed
  cookie, `/api/me`, the dev admin API, the claim, the socket projections and the direction, a
  same-origin check on the socket handshake. Bound to 127.0.0.1:3970.
- **Tests:** `pnpm verify` green, 14 files, 62 tests. Coverage: domain 94.4 % branches, 99.5 %
  lines (threshold 85 % branches); application 86.4 % branches. The resolution fuzz compares 200
  random claim sets with a brute-force reference.
- **Sabotage probes, each run once:** (a) the rank line removed from `compareClaims` → 3 tests
  red (the rank test, the conflict view, the fuzz); (b) the redaction in `caseView` replaced by
  "always the sealed artifact" → "never leaks" red; (c) one case of the logged assignment altered
  → `verified: false`, kept as a permanent test. (a) and (b) restored before the commit.
- **Removed:** the skeleton's `checkSetup` use case and the health-only `app.test.ts`, replaced by
  the real ones. **Reused:** node:crypto for sha256 and the secure port; `@fastify/cookie`'s
  signing; nothing in the kit covers server logic.
- **Lines (new files):** contracts 13–127, domain 19–152 (tests ≤ 161), application 17–158,
  server 9–180 (tests ≤ 151). The largest source file is `apps/server/src/realtime.ts` (180).

### Piece 3 report

- **Client** (`apps/web`, React 19.3.1 + Vite 8.3.4, socket.io-client 4.8.4): Vite on
  0.0.0.0:5470 proxying `/api` and `/socket.io` to 127.0.0.1:3970; the kit's `themeInit()` and
  `<script src="theme-init.js">`. Routes: `/` (dev sign-in for a guest, the current show's state,
  the registration board with the artifact table), `/show` (the stage), `/results/<id>`, `/admin`
  (N, W, prize labels, "Quick Test seed", Quick Test, Create show, and per show Open
  registration, Fill with bots, Close, Seal, Start show).
- **The stage:** the cases on one to four concentric half circles (`stage/arc.ts`), each with
  number, owner and a season glow; the selected case large in the centre under a CSS spotlight,
  the rest dimmed; tension darkens the stage and shakes the case; open shows the artifact; prize
  its slot and label or "No prize"; owner the lower third with name and rank badge, confetti on
  the main prize only (hidden under reduced motion). The top bar: still hidden, found with owners,
  the short commitment. The direction bar only for the holder.
- **Kit, reused (nothing rebuilt):** `tokens.css`, `fonts.css`, `motion.css`, `fit.css`,
  `shell.css`; `themeInit()`; `useTheme`, `ThemeToggle`; `useFitScale`; `useDockView` and
  `CALL_SLOT` (the dock reserve). `useShownTheme` is not used: nothing on these screens must
  follow the shown theme (no chat frame yet). No `BackLink` (standalone).
- **Built under `packages/ui/src/pending/`:** `fit-cases.css` (BACKLOG 19, "kit: floors for
  cases") and `useDockReserve.ts` (BACKLOG 20, "kit: dock reserve without a chat").
- **Stage font:** Fredoka SemiBold copied from `seasonal-spirits` (its `@fontsource/fredoka`
  5.3.0, latin 600 woff2) to `assets/fonts/` with its OFL licence (`assets/README.md`), used only
  for case numbers and artifact names (`.show-font`).
- **Component tests** (Vitest, jsdom, Testing Library): every step state rendered from a given
  view (`stage/Stage.test.tsx`), the conflict view and the "your rank is higher / lower" hint
  (`board/RegistrationBoard.test.tsx`), the direction bar for the holder only, the client
  importing neither domain nor application and the result showing the server's verdict as it came
  (`App.test.tsx`).
- **Tests:** `pnpm verify` green, 16 files, 80 tests.
- **A flaky-looking timeout fixed at its cause:** a socket test timed out at 5 s in the full run
  (16 workers at once, ~13 s startup each) and passed alone. Workers are now half the cores, at
  most four, as Mini Games (`vitest.config.ts`), and the server's tests get 20 s
  (`apps/server/vitest.config.ts`).
- **Removed:** the skeleton's heading-only `App` and its test. **Lines:** web sources 30–159,
  CSS 21–264, tests 68–117; ui 11–34.

### Piece 4 report

- **Browser tests** (`e2e/`, Playwright 1.64.1, Chromium): their own server on 127.0.0.1:3980
  with data under `.local/e2e/` (deleted at every start, `e2e/server.ts`) and their own client on 5480. Journey 1: admin sign-in, Quick Test N = 12, W = 3, seed `sc-n1-01`, four cases through
  the five steps (a blank first, then the main prize and the two others), each step asserted
  visible and the lower third naming the owner, hand-over to "Noah" in a second context, who ends
  the show; the result says "verified" with the commitment shown at sealing. Journey 2: Lena
  (rank 2) and Hugo (rank 4) claim case 7, Hugo holds it, Lena sees "Your rank is lower" and
  re-picks case 8; Ivy (rank 4, later) sees "Equal rank: the earlier pick holds" and does not
  take it; after the close Hugo owns 7, Lena 8, Ivy nothing. Journey 3: every socket frame a
  player receives is recorded; no public view before the end holds the secret, the assignment or
  an unopened case's artifact, no moderator view reaches the player, and the commitment on the
  lobby before the show equals the result's. Journey 1 finds the main prize by replaying the
  Quick Test from the seed in memory (`e2e/helpers.ts`), not from anything the client receives.
- **CI:** job `e2e` (Chromium) added to `ci.yml`; `browsers.yml` runs the projects `firefox`
  and `webkit-mobile` nightly once master holds the suite.
- **Pictures:** `.local/screens/proto-v1/`, 80 files: board, stage-tension, stage-owner and
  result at the ten check sizes of CONCEPT §7, light and dark, plus `checks.json` (smallest
  visible text and sideways overflow per picture: no text under 14 px, no sideways overflow).
- **Fixed after looking at the pictures:**
  - `stage-owner-1920x1080-dark.png`: every case shrank to the floor and the owner names
    became "bot…". The confetti pieces fall below the stage, the fit counted them as overflow
    and scaled the whole screen down. The confetti now sits outside the measured parts.
  - `stage-owner-375x667-*.png`: the centre case was cut off. The phone's shell bar wrapped to
    three rows, about 140 px against the 64 px the stage subtracts, and the stage could not
    scroll. Phones now get a two-row shell bar of a known 108 px, and below 700 px the stage and
    result screens are their own named scroll areas. The owner's caption sits above the centre
    case on a phone.
  - `stage-owner-1366x768-light.png`:
    - the lower third covered cases 1 and 15; the half circle now keeps the bottom corners free;
    - an opened case's artifact name ran out of its card; the card now shows the gem only,
      with the name as its tooltip;
    - the found prize stood in the "Still hidden" row; it now has its own "Found:" label;
    - case cards keep at least 62 px, so a name like "bot-24" stays whole.
  - `result-1366x768-dark.png` and `board-*`: "Prize 2 · Prize 2" and "Prize 2: Prize 2" for an
    empty label. They now read "Prize 2" (`prizeTitle` in contracts).
  - `board-1366x768-light.png`: the lobby line and the board heading both said "Registration is
    open". The board heading is now "Pick a case" or "The cases and their owners". The lobby
    says "Registration is closed" once it is, where it said "open" before (a real defect).
- **Seen and left:**
  - `stage-owner-1280x720-light.png`: the large centre case covers the two dimmed cases
    behind it (19, 20) at the smallest PC height. They are dimmed and stand behind the
    spotlight, as on a studio floor.
  - `board-1920x1080-dark.png`: the artifact table sits below an empty band, because the board
    keeps the dock's height free (DECISIONS D7).
  - `stage-tension-1280x720-light.png`: "lights down" in the light theme greys the stage rather
    than darkening it to night. Readable, but less dramatic than in dark.
- **Tests:** `pnpm verify` green, 16 files, 81 tests; the three journeys in Chromium passed
  (journey 1 24 s, journey 2 28 s, journey 3 36 s).
- **Dependencies added:**
  - @playwright/test 1.64.1, Mini Games' version;
  - tsx 4.23.15 at the root, to start the test server;
  - the workspace packages `@sc/application` and `@sc/domain` as root dev dependencies, for the
    Quick Test replay.

### Choices made without the owner

- **"Start show":** the concept goes SEALED → LIVE, and the task names no start action. The
  smallest option: a separate start step (`start` use case, `POST /api/dev/shows/:id/start`, a
  button in the dev admin); whoever starts holds the direction. Quick Test starts by itself.
- **Closed registration has no state of its own:** the show stays in `registration` with
  `registrationOpen: false` until it is sealed, so the five states of the task stay as they are.
- **The five steps as one use case:** `step(showId, by, step)` with `tension | open | prize |
owner | return` in place of five functions; the socket sends `direction:step`.
- **"The current season"** (relics and the blank, CONCEPT §6): the meteorological season of the
  show's creation date in the northern hemisphere (`packages/application/src/season.ts`).
- **Who counts as a moderator:** roles `moderator` and `admin`. The hand-over goes only to a
  moderator who is watching the show (the "signed-in moderator" of the task).
- **One id per sign-in:** the dev sign-in draws a new UUID each time, so two tabs with the same
  name are two people.
- **The fit hook's game:** the kit's `useFitScale` takes `mini-games` or `bingo` only. The
  screens pass `mini-games` for its 0.6 scale floor (Bingo's floor of 1 would never shrink); the
  readable floors come from `data-sk-game="cases"` (BACKLOG 19).
- **The phone's "two rows":** at widths under 700 px the cases form two rows in a horizontally
  scrolling, named area ("Cases"), so no case gets smaller than the 44 px target.
- **The dock reserve** applies to all three stage screens (registration board, stage, result)
  in the desktop view only, as the kit's dock does.
- **Selecting a case** is a click on the case for the holder; the bar holds the later steps.
- **A found prize:** it enters the top bar's "found" list at its "Prize" step; at "Open" the
  artifact is already visible on the stage but its meaning is not yet named.
- **Phones below the floors:** the stage and the result scroll as their own named region
  ("Stage", "Result"); the lobby with its board scrolls as a normal page.
- **The `e2e` job is not a required check** of master; the protection lists `verify`,
  `security`, `docs` as set in piece 1.
- **Kit tag:** `git ls-remote` showed `v0.5.0` as the newest tag (the task expected v0.4.1). The
  task's rule is the newest tag, so `v0.5.0` is pinned (DECISIONS D15).
- **Kit's local checkout:** another session was switching `C:\Users\weudl\seasonal-kit` while this
  chain read it (`src/react/` vanished between two reads). The kit was therefore read from the
  installed package of the pinned tag, not from the local checkout.
- **CodeQL permissions:** `security-events: write` sits on the job, so the workflow's top level is
  `contents: read` like every other workflow (Mini Games has both at the top).
- **Browsers workflow:** until master holds `e2e/playwright.config.ts`, the nightly job prints a
  notice and runs nothing, so it is never red for a suite that is not merged yet.

### Needs the owner's hand

- **Renovate:** `renovate.json` is in the tree; whether the Renovate app covers the new repository
  is the owner's setting. At the end of the chain no onboarding PR had appeared
  (`gh pr list --state all` empty).
