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

## 2026-11-23

Numbered D54: `proto/cases-v1` holds D18–D53 and keeps them when it is merged.

- **D54 — Working cheaply.** From 2026-11-23 the saving rules that Seasonal Bingo Royale has had
  since 2026-11-06 apply to every Seasonal project: spend fewer tokens without testing or
  checking less. In this repository they are CLAUDE.md "Working cheaply".

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

## 2026-11-23, day chain SC-D5: the owner's decisions D40–D41 and the proposals D42–D45

D42–D45 were the planning chat's proposals, built and standing until the owner said otherwise;
the owner confirmed them on 2026-11-23 (D46).

- **D40 — Kit v0.11.0.** The kit is pinned to v0.11.0; every stand-in under
  `packages/ui/src/pending/` that the kit now has is replaced by the kit's part.
- **D41 — The kit-version watch.** A kit-version watch reports, on every verify and in CI, the
  pinned tag against the newest tag; it never fails the build; moving the pin stays the owner's
  word.
- **D42 — Registration with confirmation (proposal, until the owner says otherwise).**
  Registration creates the account only after a confirmation link from the mail is used; before
  that nothing exists, so a sign-in reveals nothing.
- **D43 — A letter in every name (proposal, until the owner says otherwise).** An account name
  contains at least one letter.
- **D44 — Applause limits (proposal, until the owner says otherwise).** Applause is limited per
  account for signed-in users and per address for guests; guests may applaud.
- **D45 — Separate address budgets (proposal, until the owner says otherwise).** Sign-in has 20
  requests a minute per address and claims 300 a minute per address, each its own budget; the
  per-player and per-socket limits stay.

## 2026-11-23, night chain SC-N6: the owner's decisions D46–D49

- **D46 — D42–D45 confirmed.** Registration with a confirmation link, a letter in every name,
  the applause limits per account or per guest address, and the separate address budgets are
  decisions, no longer proposals.
- **D47 — Kit v0.11.1.** The kit is pinned to v0.11.1.
- **D48 — The brake against guessing at sign-in.** Sign-in keeps the strict brake of before
  SC-N4, the kit's RateLimiter with Mini Games' rule: 20 tries per 15 minutes per address, and 5
  per 15 minutes per login and address. It answers in front of the password check, and before
  the cap of 20 sign-ins a minute per address (D45) counts the try; the cap stays as the outer
  limit.
- **D49 — The case on the stage is a real case.** A body with a handle and a lid hinged at its
  back edge; at "Open" the lid opens slowly towards the viewer in perspective and shows the
  inside before the artifact rises out of it. The opening's duration stays the admin setting
  (1.6 s by default).

## 2026-11-23, task SC-P7: the owner's decisions D50–D53

- **D50 — The case accepted; the artifact rises straight up.** The case's look and opening (D49)
  are accepted. The artifact rises straight up out of the centre of the case: horizontally
  centred on the case from its first visible frame to its last; only its vertical position and
  its scale change. Its name and the meaning stay centred under it.
- **D51 — The brake counts failures only.** The sign-in brake, 20 per 15 minutes per account and
  per address, counts failed attempts only; a successful sign-in does not count. The cap of 20
  sign-ins a minute per address stays. This replaces the counting of D48.
- **D52 — The opened artifact for a screen reader.** At the Open step a screen reader hears the
  artifact's name and its meaning at once, through a visually hidden polite live region,
  independent of the picture's timing.
- **D53 — The inner row on a wide, short window.** At 1280 × 720 and 1536 × 768 the risen
  artifact may cover the two dimmed middle cases; no change.

## 2026-11-23, task SC-R1: the owner's decision D55 and the release

- **D55 — The brake per account and address.** The sign-in brake counts failed attempts per
  account-and-address pair: 20 per 15 minutes brake that pair only. Per account across all
  addresses the brake starts at 100 failures per 15 minutes. Per address across all accounts it
  stays at 20 failures per 15 minutes. A success counts nothing and resets nothing. The cap of 20
  sign-ins a minute per address stays. This replaces the per-account 20 of D51.
- **Release 1.0.0.** The merge of `proto/cases-v1` into master and the tag `v1.0.0` are approved.

## 2026-11-24, night chain SC-N7: the owner's decision D56 and what follows from it

- **D56 — The whole kit before the VPS.** Cases takes the whole kit now, before the first
  server: `@seasonal/kit` is pinned to v0.17.0; the kit's `AppHeader` replaces the game's own
  header; the whole game is checked against the kit's `docs/HANDBOOK.md`.
- **D57 — Sign-in's brake counts with the kit's `FailureBrake`.** With a full map (100 000 keys,
  every one active in the window) the kit refuses a new key and keeps every held key's count; the
  game's own class, which the kit's grew out of, evicted the oldest key. D55's keys and limits are
  unchanged. A flood of fresh addresses can therefore shut out new addresses until the window
  passes, as the kit documents; the test that covered eviction covers the kit's rule now.
- **D58 — The kit's header and its Menu.** The game's header is the kit's `AppHeader`, in the
  kit's order: the way back to Seasonal Entertainment (website mode), the brand, the pages, the
  account chip with its buttons, the theme toggle at the far right; in development only the
  "Quick Test" link and the "Dev sign-in" menu. On a narrow screen the kit folds the pages and the
  account into one "Menu" button; this replaces D29's wrapping menu. The chip reads "name (role)"
  and the website step badges are no longer shown in the header (they stay on the board, the
  lower third and the players panel). `--shell-height` stays: the stage, the board and the bar's
  panel subtract the header's measured height.

## 2026-11-24, night chain SC-N8: the owner's decisions D59–D64

- **D59 — The GitHub settings are the kit's.** The repository is set like the kit's: merge commits
  only, the branch deleted after a merge, conversations resolved on master (its required checks,
  strict and admins stay), no wiki and no Projects, a ruleset that makes `v*` tags immutable,
  vulnerability alerts and automated security fixes on, actions required to be pinned to SHAs
  (docs/RELEASING.md, "Repository settings").
- **D60 — The phone bar and the largest text.** At 390 × 844 and 360 × 780, at the normal root font
  and at 200 %, no page scrolls sideways, no text in the game bar, the ceremony or an owner's name
  is cut, and the game bar is one row at the normal font; the 14 px text floor holds.
- **D61 — Privacy.** Accounts stay until the player deletes them. On deletion the account and its
  personal data (name, e-mail, password hash, two-factor secrets, recovery codes, sessions,
  pending mails) are removed, and every show, chronicle entry, result page and "My matches" row it
  appears in shows "deleted player"; the show's sealed distribution and commitment stay intact.
  Server logs are kept 14 days. In standalone mode a player deletes their account (password, and a
  current code with two-factor sign-in; the last super-admin cannot) and downloads their data as
  JSON. In website mode the accounts belong to the website, which deletes and exports them. A
  privacy page says what is stored, why, how long, how to delete and export, and whom to contact.
- **D62 — The four kit parts.** The game bar's back link to Seasonal Entertainment in website mode
  (also in focus mode), the website's season feed for the season colours, `afterFonts` on the
  stage's fit, and `withoutChat` where the game runs without a chat, each with the kit's defaults.
- **D63 — The production bundle and the mail links.** The start page's dev form, the "Dev sign-in"
  menu and the admin's Quick Test are not in the production build (a build-time flag, not a runtime
  check). A password reset's and a registration's token travel after the link's `#`, not in its
  query.
- **D64 — Tests and the steps before production.** Tests exist where they guard something real,
  with no coverage target; the thresholds are not a goal. The steps before production wait for the
  VPS.

## 2026-11-24, night chain SC-N8, kit v0.19.0: D65

- **D65 — The header's step badges are the kit's.** The kit is pinned at v0.19.0 (tag object
  2ab45ba, commit 19f0208; kit K56). A website member's steps go to the kit's `AppHeader` as
  `account.steps`, exactly as the kit's `identityFrom` returns them (`ladder`, `name`, `icon`), and
  the kit draws, limits and checks them (at most three, only the website's own icon files). The
  game has no badge type, no stand-in and no filtering of its own for the header; a standalone
  account passes none. The boards, the lower third and the players panel keep their own icons
  (`badges`). The kit's 0.18.0 migration names no change for this game.

## 2026-11-25, task SC-A1: D66

- **D66 — The accessibility check is part of the required e2e job.** axe with the WCAG 2.0 to 2.2
  A and AA rules (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `target-size` on) runs on
  every screen in light and dark at 1536 × 768 and 390 × 844, in Chromium. A finding of impact serious
  or critical fails the job. A finding in a part of the kit is not fixed here: exactly that rule on
  exactly that selector is excluded in the spec, with its BACKLOG row, and goes to the kit's
  planning chat. A real screen-reader run is not part of it.

## 2026-11-25, night chain SC-N10: the owner's decisions D67-D69

- **D67 — The kit's newest version on this branch.** Cases takes `@seasonal/kit` v0.22.0 (tag
  `v0.22.0`, commit `2e8ed41`) in one task, with every line of the kit's `docs/ADOPTION.md` for
  Cases since v0.15.0. Version `1.1.0-rc.2`.
- **D68 — Backups come from the kit, first, before production.** Cases uses the kit's
  `ops/backup.sh` and its pull scripts.
- **D69 — The CSRF guard is the kit's.** `writeCheck` replaces Cases' own guard.

- **D70 — The health routes are the kit's, the old ones removed** (night chain SC-N10, from D69's
  adoption). `/healthz` (liveness: status and version) and `/readyz` (readiness, 60 a minute per
  address) under the base path replace `/api/health` and `/api/ready`. No alias is kept: nothing
  outside this repository is documented to call the old paths (searched here and in the website's
  docs and server).

## 2026-11-25, night chain SC-N10: what stays Cases' own beside kit v0.22.0

- **D71 — The account feed reads with plain `fetch`.** It asks the website's own local address
  (`SC_WEBSITE_LOCAL_ORIGIN`, plain http on the same host, set by the operator), not an outside one;
  the kit's `guardedFetch` is made to refuse exactly such addresses unless `allowLocal`. It stays;
  a later step may pass `allowLocal` and `allowedHosts` to get the kit's time and size limits.
- **D72 — The address limits, the account and session stores, the sign-in's brake keys (D55), the
  built client's serving, the log and the mailer stay the game's.** The kit offers the limiter, the
  brake, the session-end signal, the cookie and the headers they stand on (all used); it offers no
  store, no client serving, no mailer.
- **D73 — Two pieces of CSS still name kit classes, as the game's layout, not as patches:** the
  shell gives the docked screen the height left under the header (`.shell > .sk-docked`,
  `.sk-docked-main`), and the start card's icon slot sizes the game's own logo. The page takes the
  visible height as the kit's docs ask of the game.
- **D74 — The result page's words, the date format and the commitment's short form stay the
  game's** (`screens/Result.tsx` inside the kit's `ResultFrame`, `packages/ui/src/format.ts`); the kit
  has no date or commitment format.

## 2026-11-25, task SC-CI1: D75

- **D75 — One CI run per change.** The CI workflow runs on a push to `master` and on a pull
  request against `master` only, so a push to a branch with an open pull request starts one run,
  not two identical ones. A branch is checked by its pull request.

## 2026-11-25, night chain SC-N11: the owner's decision D76 and what follows from it

- **D76 — Docker is Cases' only production path.** Cases moves to Docker before production, as the
  other games; the native install (a PostgreSQL role, a systemd service, Node on the host) is removed,
  so there is one way to run it on a server. Version `1.1.0-rc.3`.
- **D77 — The image.** One image per mode (`SC_MODE` as a build argument): the client's base path
  (`/` or `/games/cases/`) is built into it. The server runs its TypeScript with tsx, as
  `pnpm start` does (no server bundle, unlike Mini Games), and serves the built client itself
  (`web.ts`), unchanged. It runs as uid 10001, keeps nothing on disk, and its health check asks
  `/readyz`.
- **D78 — The installer and the backup on Docker.** `deploy/install.sh` installs and updates the
  compose stack (both modes): it checks Docker and says how to install it, builds the image on the
  server, writes the env file, starts the stack, waits for `/readyz`, writes the website route file
  as before; `--update` backs up first; `--check` reports the stack's health. The kit's backup runs
  against the database container with its systemd units as the kit prints them: this supersedes the
  two rewrites of the units made for the native install (night chain SC-N10, under D68). The logs go
  through Docker's syslog driver into the game's 14-day journal namespace (D61). Website mode joins
  the website's network; the game reads the account feed at `http://site:3800` in both modes.

## 2026-11-26, night chain SC-N12: the owner's decision D79 and what follows from it

- **D79 — Every kit part is adopted.** Every part the kit's `docs/ADOPTION.md` marks "Only on the
  owner's word" for Seasonal Cases, from "Since v0.22.0" to "Since v0.32.0", is adopted: one
  solution for every game, no lasting game-side exception. The one exception in time is the load
  check, which comes before Cases' production. The kit is pinned at v0.32.0 (commit `0016e86`);
  version `1.1.0-rc.4`.
- **D80 — The client's shared parts.** The step badges are the kit's `StepBadges`, after a name, on
  the board, the stage's cases and the lower third; the views send a member's whole steps
  (`ladder`, `name`, `icon`), and an account keeps nothing but them (migration 0005 drops the
  separate icon list). This ends the last sentence of D65 but one: the boards no longer keep icons
  of their own. The client's server calls are the kit's `createApiClient`; the sentence of a refusal
  is read from `ApiError.body.error`.
- **D81 — The server's shared parts.** The account feed is read with the kit's `guardedFetch`, the
  configured local origin of the website (`SC_WEBSITE_LOCAL_ORIGIN`) its only local one, with the
  kit's time and size limits and no redirect: D71 no longer holds, its reason (the guarded fetch
  refused exactly such an address) is gone since kit v0.27.0. The security headers say
  `secure` wherever the game is served over https, by the same rule as the session cookie.
- **D82 — Two database roles (kit K90).** An installed database has `sc_owner`, which migrates, and
  `sc_app`, which the running game connects as and which only reads and writes rows (the migration
  record: reads only). The stack's one-shot service `migrate` runs before the game; the installer
  sets the roles up with the kit's `db-roles`, on an existing database once as its conversion (an
  update backs up first), and after every restore. Development keeps its one user.
- **D83 — The server's operations are the kit's.** The installer is `ops/install.sh` (K86). The
  kit's whole `ops/` folder comes out of the game's image to `/opt/seasonal-cases/kit`; the
  installed game's command `scases` is the kit's admin command (status, update, confirm, rollback,
  backup, restore, logs, uninstall; backups kept unless `--purge-backups`) with the game's `start`
  and `admin` verbs: an update is `scases update <ref>`, so the installer's `--update` is gone
  (D78), as are `deploy/admin.sh` and `deploy/backup.sh`. One environment, `prod`
  (`/etc/seasonal-cases/prod.env`; the backup's settings in `backup.conf`). The route file is the
  kit's `sk_route_install` with the game's secret header; it refuses `<base>/metrics` and no longer
  the profile card's path at the proxy, which the server refuses to every proxied request itself,
  and it no longer carries the trusted range as a comment (D37's remembered range stays). The
  operator's address (`sk_operator_email`) is what the privacy page names; the installer's
  `SC_PRIVACY_CONTACT` answer is gone. Standalone installs get the kit's host baseline. The
  database service carries the kit's container hardening, held by a test.
- **D84 — One operator guide.** `docs/operator-guide.md` holds what `docs/INSTALL.md` and
  `docs/OPERATIONS-CASES.md` held, in the kit's section order (K86).
- **D85 — The test parts are the kit's.** The client's static guards are the kit's
  (`findFixedColours`, `findSmallText`, `findLowContrast`; `apps/web/src/guards.test.ts`); the
  screens run walks every screen with the kit's `sweep` (seven sizes, 100 % and 200 %, both
  themes, its probe and axe) and keeps beside it only the game's own checks (text floor, the risen
  artifact's centre, the phone bar in one row); the website-mode browser tests run behind the kit's
  `startWebsiteStandIn`, whose app is the game's Vite client. The game's own stand-in website is
  removed; the accessibility check excludes nothing any more (BACKLOG 70, closed).

## 2026-11-26, night chain SC-N13: the owner's decisions of 2026-11-26 and what follows

- **D86 — Kit v0.34.0, one look for every game.** The kit is pinned at v0.34.0 (commit `7c1e97f`),
  version `1.1.0-rc.5`. The kit's base components and its three header looks (the filled account
  chip, the compact back link with a 44 px tap area, the solid "Sign in" when signed out) are the
  one look of every game; known defects are fixed before the owner looks. Sign-in's brake holds
  a place for each try before the password is checked (the kit's `reserve`), so guesses sent at
  the same moment are held to D55's limits.
- **D87 — The controls are the kit's.** Buttons, panels and fields are the kit's `components.css`
  (`sk-btn` with `--primary` and `--danger`, `sk-panel`, `sk-input`, `sk-select`); the game's
  `.button`, `.card` and bare field rules are gone, and neither the header nor the game bar gets a
  button class from the game, so the header's three looks (K96) and the bar are the kit's alone.
  The end-of-show button keeps the game's highlight. The dense result frame is not used: measured,
  the result's first part fits from 1280 x 720 up.
- **D88 — The keys have a file of their own, and a restore puts them back.** The data, cookie and
  recovery keys are in `/etc/seasonal-cases/prod.keys`, the one secret file a backup carries; the
  admin command names the folder (`SK_ADMIN_SECRETS_DIR`), so a restore puts the keys back and
  refuses differing ones, before anything is replaced, unless forced. The settings file travels no
  longer (D78, D83): it holds settings an update changes, which would make every older backup look
  different, and the database's passwords, which are the server's own. On a new server the guide
  installs, then restores with `--force-env`.

## 2026-11-27, night chain SC-N14: the move to kit v0.38.0

- **D89 — Kit v0.38.0.** The kit is pinned at v0.38.0 (commit ), version .
  Its fixes replace the game's allowances (BACKLOG 77, 78); the rule for checks is the kit's
  "How we check", in CLAUDE.md.
- **D92 — The way to production waits (owner, 2026-11-27).** Bingo Royale goes to production
  first. The kit's production parts of v0.35.0 (the privacy data list, the scan call, the
  release workflow with , , the full browser suite nightly
  only) wait for Cases' own way to the server.
