# Night runs

The morning sheets of the unattended night chains, newest first.

## Night chain SC-N1 (2026-11-21)

Repository, standards and the playable prototype. Branch of the prototype: `proto/cases-v1`
(nothing merged; the owner looks at the branch first).

### Final report

Written when the chain ends.

### Pieces

| Piece                                      | Done                                                                                   | Running | Open                            | Needs the owner's word                        | Commits                              | CI run ids                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------- | ------- | ------------------------------- | --------------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| 1 Repository and standards                 | standards, skeleton, CI, kit v0.5.0, docs; repository created; master protected        | —       | Renovate onboarding (see below) | kit tag v0.5.0 vs. the concept's v0.4.1 (D15) | master `0aee998`…`2bf720c`           | CI 44850888611 green; CodeQL 44850888453 green |
| 2 Contracts, domain, server                | contracts, domain with probes, application, server with socket tests                   | —       | BACKLOG 17, 18 (later)          | the "Start show" step (below)                 | `proto/cases-v1` `90a40e1`           | CI 44853721518 green                           |
| 3 The client                               | lobby, board, stage with five steps, direction bar, result, dev admin, component tests | —       | screenshots and fixes (piece 4) | Fredoka (CONCEPT §14), the phone's two rows   | `proto/cases-v1`, see piece 3 report | see piece 4 row                                |
| 4 Play-through, browser tests, screenshots | —                                                                                      | —       | all                             | —                                             | —                                    | —                                              |

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
  is the owner's setting. Checked again at the end of the chain.
