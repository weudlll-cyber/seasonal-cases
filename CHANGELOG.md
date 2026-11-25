# Changelog

What changed, by release. The commits behind each line are on the branch named; the night chains'
reports are in [docs/NIGHT-RUN.md](docs/NIGHT-RUN.md).

## 1.1.0-rc.2 (not tagged; the tag follows the merge with the owner's word)

Branch `kit/v0.17-adoption`, night chain SC-N10: the whole move to kit v0.22.0 (DECISIONS D67 to
D69), on top of 1.1.0-rc.1.

- **Kit v0.22.0.** The game bar's panel buttons carry `aria-controls` (kit v0.20.0).
- **The kit's server parts (D69, D70):** the CSRF check (`writeCheck`; a write that names no origin
  is now refused too), the security headers (the kit's strict set: no referrer, scripts and styles
  from the game only, framed only as the mode allows; helmet is gone), the session cookie
  (`__Host-sc_session` at the root of its own host, `__Secure-sc_session` under the website's path;
  a session of a build before this one signs in again), the season feed's guarded fetch, and
  `/healthz` and `/readyz` in place of `/api/health` and `/api/ready` (the installer waits for
  `/readyz`).
- **Backups (D68):** with your age public key the installer sets up the kit's encrypted nightly
  backup (database and the settings with every secret; no uploads exist), a timer at 03:30, and
  `sudo ./deploy/backup.sh` to back up, restore and drill; pulling to your own computer and
  restoring are in docs/INSTALL.md. Without a key the installer says there is no backup. Drilled on
  the dev stack (docs/OPERATIONS-CASES.md).

## 1.1.0-rc.1 (not tagged; the tag follows the merge with the owner's word)

Branch `kit/v0.17-adoption`, night chain SC-N7: the whole kit, v0.17.0, before the first server
(DECISIONS D56).

- **Kit v0.17.0** (from v0.11.1, the migrations of 0.12.0 to 0.17.0):
  - the 49 shared custom properties are `--sk-…` (0.14.0);
  - "Applaud" is the game bar's press button and the Chat button opens the dock's chat through the
    kit's hook (0.13.0): `packages/ui/src/pending/` is gone;
  - sign-in's failure counting is the kit's `FailureBrake` (0.15.0; D57);
  - the open phone chat sheet is never taller than the space left above the bar (0.17.0).
- **The kit's header (D58):** `AppHeader` in the kit's order, with "name (role)" in the chip and, in
  development, "Quick Test" and "Dev sign-in"; on a narrow screen the pages and the account fold
  into one "Menu" button in place of the wrapping menu.
- **The phone bar and the largest text (D60):** on a phone the game bar's fact wraps instead of
  ending in "…" and the buttons keep one row; no page scrolls sideways at a 200 % root font; an
  owner's name, a lower third and an artifact's name wrap instead of being cut. The screens run
  asserts it (overflow, ellipsis, the text floor, the bar's height) at four sizes in both themes.
- **Privacy (D61):** a standalone player can download their data ("Download my data", a JSON
  file without any secret) and delete their account (password, and a current code with a second
  factor; the last admin is told to make another admin first). Every show, the chronicle, the
  result pages and "My matches" then show "deleted player"; the sealed distribution and its
  commitment do not change, and the stored event log holds no name any more. The website's feed
  deletion runs the same erasure. A privacy page (`/privacy`, in the header and under the sign-in
  and registration forms) says what is stored, why, for how long and whom to ask
  (`SC_PRIVACY_CONTACT`). The installer keeps the game's server logs 14 days, in a journal
  namespace of their own (`journalctl --namespace=seasonal-cases -u seasonal-cases`).
- **The kit's four parts (D62):** the way back to Seasonal Entertainment stays in the game bar
  during a live show (website mode); a new show in website mode takes the website's season (its
  public season feed, read by the kit's `seasonFeedReader` through a guarded fetch: https only,
  public addresses only, no redirect), and the date's season while the feed has not answered or
  is stale; the stage and the registration board fit again once the show font has loaded;
  without a chat the screens sit in the kit's `DockedScreen` `withoutChat`, so the page follows
  the phone's keyboard.
- **The production bundle (D63):** the start page's development form, the "Dev sign-in" menu, the
  admin's Quick Test and "Fill with bots" are loaded under Vite's build-time DEV flag, not hidden
  by a runtime check; `pnpm bundle:check` (also a CI step) builds the client and searches the built
  files for seven development strings: none is found (the build before held all of them).
- **Mail links (D63):** a password reset's and a registration's token travel after the link's `#`
  (`/reset#token=`, `/confirm#token=`), which a browser never sends: not to the server, not in a log,
  not in a referrer. The page takes the token off the address when it is spent.
- **Kit v0.19.0 and the header's step badges (D65):** a website member's steps (at most three)
  show beside the name in the header's chip, and in the folded Menu, drawn and checked by the kit's
  `AppHeader` (`account.steps`); the game keeps them as the website gave them (a new `steps`
  column, migration 0004) and passes them on unchanged. A standalone account shows none. The
  screens run holds a 32-character name with three steps on three phone sizes in both themes at
  the normal and the largest text.
- **Smaller fixes (SC-N9):** the opening's showcase page is a development build's only (the
  production bundle check searches for it too); at 360 px and the largest text the folded header's
  Menu button no longer covers the brand's name (the header run asserts it).
- **Security pass 6 (SC-N9):** two admins deleting together can no longer leave the game without an
  admin; the downloaded file is not cached; a deletion interrupted by a crash is finished at the
  next start; the season feed's guarded fetch also refuses NAT64, 6to4 and Teredo addresses.
- **The accessibility check (SC-A1):** axe runs on every screen, light and dark, desktop and phone,
  in the required e2e job. Fixed in the game: the case buttons' names contain their visible text, the
  phone scoreboard can be scrolled from the keyboard, the stage is the page's `main` with a hidden
  `h1`.
- **The pictures:** `.local/screens/sc-n7/` has four sizes in both themes and the phone sizes again
  with a 200 % root font; the 200 % ones show sideways overflow on four screens (BACKLOG 66).
- **A dev tool can no longer take the game down:** the header's lazily loaded quick tools sit in an
  error boundary, the kit's dev menu is named in the dev server's `optimizeDeps`, and each mode's
  dev server has its own dependency cache (the first browser-test run in CI crashed the page: the
  dev module had run on a second copy of React).
- **The game against the kit's handbook:** no visible change: the season colours in the stage's
  and the scoreboard's CSS are the kit's tokens, an opened case's artifact name is hidden with the
  kit's `sk-visually-hidden`, and the stage's, the gem's and the case's own tones are named arena
  tokens. What differs from the handbook and would change something is listed for the owner
  (docs/BACKLOG.md 58–65).

## 1.0.0 (2026-11-23, tag `v1.0.0`)

The first release: the release candidates below, merged into master with the owner's word
(DECISIONS, 2026-11-23).

- **The show** (rc.1–rc.4): a moderated live show of numbered cases with sealed artifacts and a
  public commitment; the click and three steps, the moving case that really opens (D49, D50),
  the opening and the ceremony, the scoreboard, sound, applause, the result with its proof.
- **Accounts and security** (rc.1–rc.4): website mode on the kit's checks; standalone accounts
  with a confirmation link, two-factor sign-in for admins with keyed recovery codes; five
  independent reviews and their fixes.
- **Toward production** (rc.1): PostgreSQL, `pnpm build` and `pnpm start`, the installer for
  Debian and Ubuntu, health and ready, the member summary and the open rounds for the website.
- **The kit:** `@seasonal/kit` v0.11.1, with `pnpm kit:check` watching for new tags.
- **This release:** sign-in's brake per account and address (D55): 20 failed sign-ins in 15
  minutes brake one account at one address, 100 brake the account everywhere, 20 brake an
  address across accounts; a success counts nothing. Master's "Working cheaply" (D54) is in.

## 1.0.0-rc.4 (not tagged; merged as 1.0.0)

Branch `proto/cases-v1`, night chain SC-N6 and task SC-P7: the owner's decisions of 2026-11-23
(D46–D53).

### Task SC-P7

- **The artifact rises straight up (D50):** it stays on the case's centre from its first visible
  frame to its last; only its height and size change. It started up to 57 px to the right (its
  centring offset shrank with the rise's scale). A long name is whole on a narrow case.
- **The brake counts failures only (D51):** 20 failed sign-ins per 15 minutes per address and per
  account; a successful sign-in does not count. The cap of 20 a minute stays.
- **A screen reader hears the opened artifact at once (D52):** its name and meaning, in a
  visually hidden polite live region, at the Open step.

### Night chain SC-N6

- **Kit v0.11.1 (D47):** its peer ranges are wider; nothing in Cases changes with it.
- **Sign-in's brake against guessing (D48):** 20 tries per 15 minutes per address and 5 per
  login and address, in front of the password check and before the 20-a-minute cap counts
  (its counting changed by D51 in SC-P7).
- **The phone's cases:** "Unclaimed" is whole at 360 and 390 px (88 px columns).
- **D42–D45 confirmed (D46).**
- **The case that really opens (D49):** every case is a case with a handle, latches and a lid
  hinged at its back edge. At "Open" the latches flip, the lid swings open towards the viewer, the
  lining glows in the season's colour, the artifact rises out of it and the meaning comes last;
  opened cases on the stage stand open, and the ceremony opens each winner's case.
- **`/dev/opening`:** the opening on its own, with replay, speed and season, in development only.

## 1.0.0-rc.3 (not tagged; merged as 1.0.0)

Branch `proto/cases-v1`, day chain SC-D5: the owner's decisions of 2026-11-23 (D40, D41) and the
proposals D42–D45, standing until the owner says otherwise.

### The kit

- **Kit v0.11.0 (D40), `d888d96`:**
  - the cases' fit floors, the dock reserve, the local chat frame and the sound toggle are the
    kit's;
  - the bar's chat button shows the dock's unread count and opens the dock's chat;
  - the bar's lead shows on a narrow phone again;
  - the open rounds come from the kit's `openRoundsPage`, which leaves out a round without an
    https join address;
  - recovery codes are HMAC-SHA-256 with the new `SC_RECOVERY_KEY` (kit K20); codes stored
    before keep working until used (kit K27).
- **The kit-version watch (D41), `02bf9fb`:** `pnpm kit:check`, last in `pnpm verify`, and a
  notice in CI. It never fails. Today it says v0.11.0 against v0.11.1.

### Accounts and security

- **`6a91c93`:**
  - an account exists only once the mail's confirmation link is used (D42);
  - a name needs a letter (D43);
  - applause is limited per account, or per address for guests (D44);
  - sign-ins have 20 and claims 300 requests a minute per address, each its own budget (D45).
- **The fourth independent review's fixes, `52dc6ef`:**
  - a waiting registration keeps its first form, so a later one cannot set the password;
  - a refused mail leaves the last link working;
  - the proxy chain is walked past every trusted hop;
  - the recovery key may not be the data key.

### Tests

- **The browser matrix:** 36 of 36 (three browsers, two sizes, six journeys); journey 6 uses an
  admin per project (`52dc6ef`).
- **The pictures:** `proto-v5`, with the registration's pending page.

## 1.0.0-rc.2 (not tagged; merged as 1.0.0)

Branch `proto/cases-v1`, night chain SC-N4 (the owner's decisions of 2026-11-22, D27–D39).

### The show

- The main prize's gem turns only in the centre case and the ceremony; the logo per theme; the
  phone menu wraps; the spotlight painted once (`0b2c8ef`).
- No bots in real shows; cases nobody claimed are "Unclaimed" and their prizes "not won"
  everywhere; "End show" asks before an early end (`95ab963`).
- The applause button: counted per live show, the confetti grows with it (`db03755`).

### Accounts and security

- Recovery codes re-issued with the password and a current code; the name rule (Latin letters
  with diacritics, digits, `-`, `_`); a registration that answers alike for every e-mail; 60 a
  minute per address for claims and sign-ins; the installer asks for the trusted range
  (`2b379cb`).
- `e2e` is a required check of master (`39fd2b8`).
- The third independent review and its fixes: a socket message without its ack is dropped (it
  stopped the server); the name rule keeps Latin look-alikes out; a re-issue ends the other
  sessions; at most 3 mails an hour per address; a name lost in a race answers 409
  (docs/security-pass.md, third pass).

### Tests and browsers

- The journeys in Chromium, Firefox and WebKit at desktop and phone sizes (nightly); WebKit's
  phone journeys pass; the admin's setup form keeps what was typed.

## 1.0.0-rc.1 (not tagged; merged as 1.0.0)

Branch `proto/cases-v1`, from `master` (the bootstrap of night chain SC-N1, piece 1).

### The show (SC-N1, SC-N2)

- The show's domain: registration with rank conflicts, sealing with a sha256 commitment that the
  result verifies, the direction held by one organiser and handed over, projections that never
  carry a case's content before "Open" (`90a40e1`).
- The client: the start page on the kit's start card, the registration board, the stage with a
  click and three steps (Open, Owner, Back to stage), the scoreboard, the moving case, the
  opening with Begin, focus mode with the kit's game bar, the ceremony, the result frame
  (`10b486a`, `c36b3e1`, `aaa6022`, `ad20ab0`).
- The season tint, the chronicle, the lobby and "My matches" (`2edcd6a`, `17886f4`).
- The settings catalogue in the admin area; a show keeps the values it was created with
  (`3d81756`).
- Fixes from the play-throughs: the ceremony kept on the stage, phone layouts (`1172a27`).

### Sign-in and accounts (SC-N2)

- Website mode under `/games/cases/`: the website's sign-in through its proxy, rights, rank and
  badges, the account-changes feed, the docked chat, the back link (`3d2d783`).
- PostgreSQL for accounts, sessions and the shows' events, the sealed secret encrypted at rest
  (`2b326a2`).
- Standalone accounts: registration, sign-in by name or e-mail, the forgotten password by mail,
  roles and ranks (`2edcd6a`); two-factor sign-in for admins (`f482024`).
- The first independent security review and its fixes (`49433d9`, docs/security-pass.md).

### Toward production (SC-N3)

- One way to name a prize; look-alike names refused; a 49 233-entry common-password list;
  `pnpm sc admin reset-2fa` (`06eafb6`).
- `pnpm build` and `pnpm start`: one process with the built client, a checked configuration
  (docs/CONFIG.md), `/api/health` and `/api/ready`, JSON logs, a graceful stop (`eeab324`).
- The website's open sign-ups and the member summary for its profile (`031f379`, `40d6bb3`).
- The installer for Debian and Ubuntu, both modes, `--update` and `--check` (`8d6b838`,
  `be9764c`, docs/INSTALL.md).
- Synthesised sound, off until a viewer turns it on (`dd90ada`).
- Browser runs in Firefox and WebKit, findings in BACKLOG 12 (`0336ab8`).
- The second independent security review and release readiness (this release).
