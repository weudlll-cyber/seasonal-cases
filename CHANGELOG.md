# Changelog

What changed, by release. The commits behind each line are on the branch named; the night chains'
reports are in [docs/NIGHT-RUN.md](docs/NIGHT-RUN.md).

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
