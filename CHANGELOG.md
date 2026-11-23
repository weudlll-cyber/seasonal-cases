# Changelog

What changed, by release. The commits behind each line are on the branch named; the night chains'
reports are in [docs/NIGHT-RUN.md](docs/NIGHT-RUN.md).

## 1.0.0-rc.3 (in progress)

Branch `proto/cases-v1`, day chain SC-D5 (the owner's decisions of 2026-11-23, D40–D45).

### The kit

- Kit v0.11.0 (D40): the cases' fit floors, the dock reserve, the local chat frame and the
  sound toggle are the kit's; the bar's chat button shows the dock's unread count and opens the
  dock's chat; the bar's lead shows on a narrow phone again; the open rounds come from the kit's
  `openRoundsPage`, which leaves out a round without an https join address. Recovery codes are
  HMAC-SHA-256 with the new `SC_RECOVERY_KEY` (kit K20); codes stored before keep working until
  used (kit K27).

## 1.0.0-rc.2 (not tagged; the tag follows the merge with the owner's word)

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

## 1.0.0-rc.1 (not tagged; the tag follows the merge with the owner's word)

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
