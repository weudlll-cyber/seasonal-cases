# Seasonal Cases

A moderated community live show for the Seasonal Entertainment community. Players register for a
show and each picks a numbered case; the server seals an artifact into every case and publishes a
commitment, and a moderator then opens the cases one at a time: a click brings a case to the
front, then Open, Owner and Back to stage, while a scoreboard shows which prizes are still hidden
and which are taken, until the prizes and their owners are found. There is no banker, no
deal and no decision a player makes during the show; nothing of monetary value is won in the game.

**Two modes.** Embedded (`SC_MODE=website`), the show runs inside the Seasonal Entertainment
website under `/games/cases/`, with the website's sign-in and its chat docked under the stage;
standalone (`SC_MODE=local`, the default), it runs on its own domain with its own accounts and
manually assigned ranks. In development the local mode also has a development sign-in (name, role
and rank, no password) for the Quick Test; it exists only with `NODE_ENV=development` and
`SC_DEV=1` (`apps/server/dev.env`).

**Status:** version 1.0.0 on master, tag `v1.0.0`; 1.1.0-rc.4 on the branch `kit/v0.17-adoption`
(the whole kit, v0.22.0; Docker from 1.1.0-rc.4), not merged yet: phases P0 to P3 built, P4 (installer, security
reviews) built; the first show on a server is the next step
([docs/CONCEPT.md](docs/CONCEPT.md) §12, [CHANGELOG.md](CHANGELOG.md),
[docs/RELEASING.md](docs/RELEASING.md)).

## Run it locally

Node 22 or newer and pnpm 12.14.0 (`corepack enable`).

```sh
pnpm install
pnpm dev       # server on 127.0.0.1:3970, client on 0.0.0.0:5470
```

Open http://localhost:5470 (the game, and `/admin` for the admin area). The client listens
on every interface, so a phone on the same network reaches it at `http://<PC's IPv4>:5470`.

| Port | What                                             |
| ---- | ------------------------------------------------ |
| 3970 | server (Fastify + socket.io), bound to 127.0.0.1 |
| 5470 | client (Vite), the game and `/admin`             |
| 3980 | the browser tests' own server                    |
| 5480 | the browser tests' own client                    |
| 3990 | the browser tests' server in website mode        |
| 5485 | the browser tests' stand-in website              |

## Install on a server

The game runs on a server in Docker only (the game and PostgreSQL, `ops/compose.yml`). On a Debian
or Ubuntu server with Docker, from a clone of this repository:

```sh
sudo ./ops/install.sh               # asks once, remembers
sudo scases update <tag>             # later: back up, switch; then: scases confirm or rollback
```

Step by step, standalone or under the website, with backup, restore and uninstall:
[docs/operator-guide.md](docs/operator-guide.md).

Every setting is in [docs/CONFIG.md](docs/CONFIG.md).

## Accounts and admins (local mode)

Players create their own accounts on the start page. Admins come from the command line: on a
server `sudo scases admin …`, in development `pnpm dev:sc …` (it reads
`apps/server/dev.env`):

```sh
pnpm dev:sc admin promote <name>     # the account becomes an admin; its sessions end
pnpm dev:sc admin reset-2fa <name>   # removes its second factor and recovery codes; sessions end
```

An admin sets up two-factor sign-in in the admin area before the accounts and settings open,
again after a `reset-2fa`. Names are compared without case, accents, width or spaces, so
`Olga` and `ÓLGA` cannot both exist.

## Website mode

The server reads its trust settings from the environment and refuses to start without them:

| Variable                                         | What                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `SC_MODE=website`                                | the base path becomes `/games/cases/`                                              |
| `SC_TRUSTED_PROXIES`                             | the website proxy's addresses or CIDRs, comma-separated                            |
| `SC_PROXY_SECRET`                                | the secret the proxy adds as `X-Sc-Proxy-Secret` on the sign-in route only         |
| `SC_WEBSITE_ORIGIN`                              | the website's origin; accounts are keyed by it and the website's user id           |
| `SC_WEBSITE_LOCAL_ORIGIN`, `SC_GAMES_SYNC_TOKEN` | the website's local address and the games' sync token for the account-changes feed |

The website side (its docs/GAME-INTEGRATION.md §6) still has to know the slug `cases`: the slug
list, the installer's question, the feed's denial in its proxy, and the catalogue card.

## The website's chat while developing

`apps/server/dev.env` sets `SC_CHAT_ORIGIN=http://localhost:5380`. With the website's development
server running on this PC, the website's chat appears docked under the stage, in the room
`cases`. The website frames its chat only for sites it approves. Approve the game's origin once:
on the website, as an admin, open **Admin → Embedding** (`/admin/embedding`) and add
`http://localhost:5470`. In development the website accepts `http://` on `localhost`
(its docs/EMBED.md, "Approving a site"). Without the website running, the docked frame stays
empty.

## Docs

- [docs/CONCEPT.md](docs/CONCEPT.md): what the show is and does (the source of truth).
- [docs/DECISIONS.md](docs/DECISIONS.md): the decisions, as dated facts.
- [docs/BACKLOG.md](docs/BACKLOG.md) and [docs/OPEN.md](docs/OPEN.md): what is open and closed.
- [docs/HANDOVER.md](docs/HANDOVER.md): where things stand.
- [docs/CONFIG.md](docs/CONFIG.md), [docs/operator-guide.md](docs/operator-guide.md) and
  [docs/RELEASING.md](docs/RELEASING.md): settings, running a server, releasing.
- [docs/security-pass.md](docs/security-pass.md): the independent security reviews.
- [CONTRIBUTING.md](CONTRIBUTING.md) and [CLAUDE.md](CLAUDE.md): how work is done here.

## License

Copyright (C) 2026 weudlll-cyber. Licensed under the GNU Affero General Public License v3.0 or
later ([LICENSE](LICENSE)). The font, the logo and the season icons belong to the Seasonal Tokens
project and are not covered by this licence.
