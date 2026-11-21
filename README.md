# Seasonal Cases

A moderated community live show for the Seasonal Entertainment community. Players register for a
show and each picks a numbered case; the server seals an artifact into every case and publishes a
commitment, and a moderator then opens the cases one at a time in five reveal steps (select,
tension, open, prize, owner) until the prizes and their owners are found. There is no banker, no
deal and no decision a player makes during the show; nothing of monetary value is won in the game.

**Two modes.** Embedded, the show runs inside the Seasonal Entertainment website with its sign-in,
chat and call; standalone, it runs on its own domain with its own accounts and manually assigned
ranks. The current prototype runs standalone on the development machine with a development
sign-in (name and role, no password).

**Status:** prototype (phase P1 of [docs/CONCEPT.md](docs/CONCEPT.md) §12).

## Run it locally

Node 22 or newer and pnpm 12.14.0 (`corepack enable`).

```sh
pnpm install
pnpm dev       # server on 127.0.0.1:3970, client on 0.0.0.0:5470
```

Open http://localhost:5470 (the game, and `/admin` for the development admin). The client listens
on every interface, so a phone on the same network reaches it at `http://<PC's IPv4>:5470`.

| Port | What                                             |
| ---- | ------------------------------------------------ |
| 3970 | server (Fastify + socket.io), bound to 127.0.0.1 |
| 5470 | client (Vite), the game and `/admin`             |
| 3980 | the browser tests' own server                    |
| 5480 | the browser tests' own client                    |

## Docs

- [docs/CONCEPT.md](docs/CONCEPT.md): what the show is and does (the source of truth).
- [docs/DECISIONS.md](docs/DECISIONS.md): the decisions, as dated facts.
- [docs/BACKLOG.md](docs/BACKLOG.md) and [docs/OPEN.md](docs/OPEN.md): what is open and closed.
- [docs/HANDOVER.md](docs/HANDOVER.md): where things stand.
- [CONTRIBUTING.md](CONTRIBUTING.md) and [CLAUDE.md](CLAUDE.md): how work is done here.

## License

Copyright (C) 2026 weudlll-cyber. Licensed under the GNU Affero General Public License v3.0 or
later ([LICENSE](LICENSE)). The font, the logo and the season icons belong to the Seasonal Tokens
project and are not covered by this licence.
