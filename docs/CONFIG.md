# Configuration

Every setting of the server comes from its environment and is read in one place,
`apps/server/src/config.ts`. A missing or malformed value stops the start with one message that
names every problem and the mode that needs the value. Settings of the show itself (default
cases and prizes, artifact names, durations, confetti) are not here: an admin changes them in
the admin area (`/admin`, Settings).

"From" says who provides the value: **installer** (`deploy/install.sh` writes it into the
service's environment file), **website** (the website's operator gives it), **dev** (set by
`apps/server/dev.env` for `pnpm dev`), **you** (only when you want something else).

## Always

| Variable        | Default                                | Required in | From      | What                                                                                                           |
| --------------- | -------------------------------------- | ----------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`      | (unset)                                | —           | installer | `production` for a real server (`pnpm start` sets it when unset); `development` with `SC_DEV=1` for `pnpm dev` |
| `SC_MODE`       | `local`                                | —           | installer | `local` (own domain, own accounts) or `website` (embedded under `/games/cases/`)                               |
| `SC_PORT`       | `3970`                                 | —           | installer | the port on 127.0.0.1; a reverse proxy faces the internet                                                      |
| `SC_LOG_LEVEL`  | `info` (production, dev), else `error` | —           | you       | `fatal`, `error`, `warn`, `info` or `debug`; one JSON line per event on stdout                                 |
| `SC_CLIENT_DIR` | `apps/web/dist` in production          | —           | you       | the built client this process serves under the base path                                                       |
| `SC_DATA_DIR`   | `.local/data`                          | —           | you       | the shows' event log without a database (development only)                                                     |
| `SC_DEV`        | (unset)                                | —           | dev       | `1` with `NODE_ENV=development` turns the development sign-in and Quick Test on (local mode only)              |

## Database and secrets

| Variable           | Default                    | Required in                         | From      | What                                                                                   |
| ------------------ | -------------------------- | ----------------------------------- | --------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`     | (none: files and memory)   | production                          | installer | `postgres://user:password@host:port/database`                                          |
| `SC_DATA_KEY`      | —                          | production; any run with a database | installer | 64 hex digits (`openssl rand -hex 32`); encrypts sealed shows and TOTP secrets at rest |
| `SC_COOKIE_SECRET` | a new random one per start | production                          | installer | at least 32 characters; signs the session cookie, so sessions survive a restart        |

## Local mode

| Variable             | Default                            | Required in                                         | From      | What                                                                               |
| -------------------- | ---------------------------------- | --------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| `SC_PUBLIC_ORIGIN`   | `http://localhost:5470`            | production; a server that mails outside development | installer | the address players open; reset links point here; `https:` makes the cookie Secure |
| `SC_TRUSTED_PROXIES` | `127.0.0.1,::1`                    | —                                                   | installer | addresses whose `X-Forwarded-For` names the visitor (the reverse proxy)            |
| `SC_SMTP_HOST`       | (none: no reset mail)              | —                                                   | installer | the SMTP relay for the forgotten-password mail                                     |
| `SC_SMTP_PORT`       | `25`                               | —                                                   | installer | its port                                                                           |
| `SC_MAIL_FROM`       | `Seasonal Cases <cases@localhost>` | —                                                   | installer | the sender                                                                         |
| `SC_CHAT_ORIGIN`     | (none)                             | —                                                   | dev       | the website's development server, whose chat is docked under the stage             |

## Website mode

| Variable                  | Default | Required in     | From      | What                                                                       |
| ------------------------- | ------- | --------------- | --------- | -------------------------------------------------------------------------- |
| `SC_WEBSITE_ORIGIN`       | —       | website mode    | website   | the website's origin; accounts are keyed by it and the website's user id   |
| `SC_TRUSTED_PROXIES`      | —       | website mode    | website   | the website proxy's addresses or CIDRs, comma-separated                    |
| `SC_PROXY_SECRET`         | —       | website mode    | installer | the secret the proxy adds as `X-Sc-Proxy-Secret` on the sign-in route only |
| `SC_WEBSITE_LOCAL_ORIGIN` | (none)  | with the token  | website   | the website's local address for the account-changes feed                   |
| `SC_GAMES_SYNC_TOKEN`     | (none)  | with the origin | website   | the games' sync token for that feed; both or neither                       |

## Build time

| Variable  | Default | What                                                                      |
| --------- | ------- | ------------------------------------------------------------------------- |
| `SC_MODE` | `local` | `pnpm build` with `SC_MODE=website` builds the client for `/games/cases/` |
