# Security pass: authentication and accounts (SC-N2 pieces 3 to 7)

This review covers the commit range `ad20ab0..f482024` on branch `proto/cases-v1` (the four
commits website mode, PostgreSQL, standalone accounts, two-factor sign-in), limited to
`apps/server`, `packages/contracts`, `apps/web/src/account`, `apps/web/src/lib`,
`apps/web/src/screens`, `e2e/server.ts`, `.github/workflows/ci.yml` and `ops`. It was done on
2026-11-21 by an independent review agent, night chain SC-N2 piece 7. Method: the full diff and the
full current files at `f482024` were read, every call path from route to store traced, the kit
pieces in use (`websiteSignInCheck`, `safeNext`, `websiteLoginLocation`, `RateLimiter`, TOTP,
recovery codes, `secretMatches`) read in `node_modules/@seasonal/kit` v0.8.0, and the candidates
below marked CONFIRMED were reproduced with throwaway Vitest probes (in-memory stores and the
development PostgreSQL on 127.0.0.1:5570), which were deleted afterwards. The existing server suite
(`pnpm vitest run apps/server`: 6 files, 36 tests) passed. Line numbers refer to `f482024`. Changes
that appeared in the working tree during the review (settings routes and store) were not reviewed.

## Findings

### 1. medium: every rate limit counts the proxy, not the visitor (CONFIRMED)

- Where: `apps/server/src/app.ts:142` (`Fastify({ logger: false })`, no `trustProxy`),
  `apps/server/src/main.ts:22` (listens on 127.0.0.1 only); the keys `request.ip` in
  `apps/server/src/localRoutes.ts:134,139,141,162,172` and `apps/server/src/websiteRoutes.ts:93,99`.
- What is wrong: the server only listens on 127.0.0.1, so every real visitor arrives through a
  reverse proxy. Without `trustProxy`, `request.ip` is the proxy's address for everyone. Every
  "per address" limit is therefore one global bucket, and the "per login and address" limit is a
  per-login limit for the whole site.
- Failure scenario: an attacker sends five wrong passwords for the login `root` (or any admin's
  name or e-mail) every 15 minutes; from then on nobody, including the real admin, can sign in as
  `root` (429). Twenty wrong sign-ins of any names lock out all sign-ins for the whole server,
  five registrations an hour stop all registrations, five forgotten-password requests an hour stop
  every reset, 30 website sign-ins a minute stop website mode for everyone. Reproduced: five wrong
  tries with `X-Forwarded-For: 203.0.113.9`, then the right password with
  `X-Forwarded-For: 198.51.100.7` answers 429.
- Suggested fix: set Fastify's `trustProxy` to the configured proxies (website mode: the same list
  as `SC_TRUSTED_PROXIES`; local mode: a new setting, default 127.0.0.1) so `request.ip` is the
  visitor; key IPv6 by its /64 as the kit's `RateLimiter` header asks; and make the per-login limit
  a soft delay rather than a lockout, or add a per-account limit that a stranger cannot fill
  alone (for example counted per account and address /64 together).

### 2. medium: a session opened with the password alone becomes a full admin session once 2FA is enabled (CONFIRMED)

- Where: `apps/server/src/twoFactorRoutes.ts:62-76` (confirm), `apps/server/src/accountRoutes.ts:39-48`
  (`admin` checks the account, not the session).
- What is wrong: before 2FA is set up, a standalone admin signs in with the password only. When 2FA
  is then enabled, other sessions of the account are not ended and are not marked as lacking the
  second factor. The admin guard asks only whether the account has 2FA enabled.
- Failure scenario: an attacker who learned an admin's password (or was handed a reset link) signs
  in before the owner enrols; the session is refused by the admin area with 403. The owner then
  enables 2FA from their own session. The attacker's old session now passes the admin area for up
  to seven days and can change every role. Reproduced with two password-only sessions: after the
  confirm on one, the other gets 200 on `GET /api/admin/accounts`.
- Suggested fix: on a successful confirm, end every other session of the account
  (`sessions.removeForAccount` minus the current one, then `ends.end`) and rotate the current one;
  or store on the session whether the second factor was passed and let `admin` require it.

### 3. low: no same-origin check on state-changing POST routes without a body (CONFIRMED)

- Where: `apps/server/src/organiserRoutes.ts:38-43` (`open`, `close`, `bots`, `seal`, `start`),
  `apps/server/src/showRoutes.ts:55` (sign-out), `apps/server/src/twoFactorRoutes.ts:51` (setup);
  nothing in `apps/server/src/http.ts` or `app.ts` checks `Origin`, `Sec-Fetch-Site` or the
  content type of HTTP requests (the socket has `sameOrigin`, app.ts:86-94).
- What is wrong: the session cookie is `SameSite=Lax`, which stops cross-site forms, but not pages
  of the same site: other ports of `localhost` in local mode, sibling subdomains of the deployment's
  domain, and every other page on the website's origin in website mode. Fastify parses
  `text/plain`, which a plain HTML form can send without a preflight. Routes that read a JSON body
  fail on such a string (400), but the body-less ones run.
- Failure scenario: an organiser visits a page on a sibling subdomain (or another dev server on
  localhost); its hidden form posts `text/plain` to `/api/shows/<id>/seal` and `/start` and starts a
  show early, or keeps resetting an admin's unconfirmed 2FA secret through `/api/me/2fa/setup`.
  Reproduced: `POST /api/me/2fa/setup` with `content-type: text/plain` and a foreign `Origin` answers 200.
- Suggested fix: one `onRequest` hook for every non-GET route under the base path that refuses a
  request whose `Origin` (or `Sec-Fetch-Site`) is not this site, as the socket handshake already
  does; and accept only `application/json` bodies.

### 4. low: the session cookie is not Secure in local mode, where the standalone accounts live (CONFIRMED)

- Where: `apps/server/src/app.ts:107` (`secure: config.mode === 'website'`).
- What is wrong: standalone accounts, password resets by mail and admin 2FA exist only in local
  mode, which is therefore the mode a public standalone server runs in. Its cookie never gets the
  Secure flag, whatever the proxy's TLS.
- Failure scenario: an on-path attacker on a public network makes the visitor's browser request
  `http://<host>/` once (any image tag); the browser sends `sc_session` in clear and the attacker
  takes over the session. Helmet's HSTS header narrows this after a first HTTPS visit, but not on
  the first visit or when the proxy strips it.
- Suggested fix: a setting for the public origin's scheme (for example derive it from
  `SC_PUBLIC_ORIGIN`): Secure whenever it is `https:`; only plain `http://localhost` development
  goes without.

### 5. low: every server-side error is dropped, including the account feed (CONFIRMED)

- Where: `apps/server/src/app.ts:142` (`logger: false`) with `app.log.error` at app.ts:104, 121,
  175 and `apps/server/src/http.ts:81`.
- What is wrong: with `logger: false` Fastify's `app.log` does nothing. A failing account feed
  (wrong sync token, website down), a failing reset mail, a failing `SessionEnds` listener and
  every 500 vanish. The headers of `accountFeed.ts` ("a failing feed is logged") and `localRoutes`
  promise otherwise.
- Failure scenario: the sync token is rotated on the website and not here; the feed answers 401
  every 15 s, nothing is logged, and locked or deleted website members keep their game sessions
  (up to seven days) without anyone noticing.
- Suggested fix: turn the logger on (Fastify's pino at `info`, request bodies and cookies
  redacted), or pass the same `console.error` sink `main.ts` already uses for the database.

### 6. low: two 2FA confirmations at once both succeed; the first set of recovery codes is dead (CONFIRMED)

- Where: `apps/server/src/twoFactorRoutes.ts:68-74`, `apps/server/src/db/twoFactorStore.ts:46-51`.
- What is wrong: the check "not yet enabled" and the enabling are two statements; `enable` updates
  without `enabled_at IS NULL` and replaces the recovery codes. The same TOTP code is accepted
  twice, against the rule that a step is never accepted twice.
- Failure scenario: a double click (or a retry) sends the confirmation twice; on PostgreSQL both
  answer 200 with different codes, the page shows the first answer and the user saves codes that
  no longer exist. Reproduced on the development database: two parallel confirms gave two sets,
  and one code of the first set was refused at sign-in.
- Suggested fix: `UPDATE two_factor SET ... WHERE account_id = $1 AND enabled_at IS NULL` and
  replace the codes in the same transaction only when that row count is 1; otherwise 409.

### 7. low: earlier reset links stay valid after a reset (CONFIRMED by trace)

- Where: `apps/server/src/localRoutes.ts:171-181`, `apps/server/src/db/credentialStore.ts:54-67`,
  `apps/server/src/auth/credentials.ts:57-68`.
- What is wrong: `takeReset` uses one token; other unused tokens of the same account stay valid for
  their hour after the password was changed with one of them.
- Failure scenario: the owner asks for two links, uses the second; someone who can read the older
  mail (a shared or later compromised mailbox) sets a new password with the first within the hour
  and ends the owner's sessions.
- Suggested fix: after a successful reset, mark every other unused reset of the account used (one
  `UPDATE password_resets SET used_at = now() WHERE account_id = $1 AND used_at IS NULL`).

### 8. low: `pnpm dev:reset-db` can drop a production schema on the same machine (PLAUSIBLE)

- Where: `apps/server/src/tools/resetDevDatabase.ts:13-17`, script `dev:reset-db` in
  `apps/server/package.json` (`--env-file=dev.env`).
- What is wrong: the guard is "NODE_ENV is development and the host is 127.0.0.1 or localhost".
  `dev.env` itself sets `NODE_ENV=development`, and `--env-file` never overrides a variable already
  in the shell. On a production machine whose shell has `DATABASE_URL` for a PostgreSQL on
  localhost but no `NODE_ENV`, both conditions hold.
- Failure scenario: an operator runs the command in the wrong shell; `DROP SCHEMA sc CASCADE` empties
  every account, session and show of the real server.
- Suggested fix: compare the whole URL with the development one (port 5570, user `sc`, database
  `sc`), or require an explicit marker that only `dev.env` sets (for example `SC_DEV=1`) and ask for
  a typed confirmation.

### 9. low: the reset link points at `http://localhost:5470` unless `SC_PUBLIC_ORIGIN` is set (CONFIRMED by trace)

- Where: `apps/server/src/config.ts:119`, used in `apps/server/src/localRoutes.ts:194`.
- What is wrong: a real standalone server that forgets the setting mails links to the user's own
  machine. Users cannot reset, and whatever listens on the user's localhost:5470 receives a valid
  token.
- Suggested fix: no default outside development: refuse to start in local mode with a mailer and
  without `SC_PUBLIC_ORIGIN`, as website mode refuses without its trust settings.

### 10. low: 2FA that a non-admin enabled is never asked for (CONFIRMED)

- Where: `apps/server/src/twoFactorRoutes.ts:51-60` (setup open to every local account),
  `apps/server/src/localRoutes.ts:111` and `apps/server/src/auth/twoFactor.ts:38-39`.
- What is wrong: any local account can set up and confirm 2FA and receives recovery codes, but the
  sign-in only asks for a code when the account is an admin. Reproduced: a player confirms 2FA and
  then signs in with the password alone.
- Failure scenario: an organiser enrols to protect their account and believes it is protected; a
  leaked password still opens it.
- Suggested fix: either refuse setup to accounts that do not need it (409), or ask the code of
  every account with enabled 2FA (`found.enabled` alone decides at sign-in).

### 11. low: the common-password list has ten entries (CONFIRMED by trace)

- Where: `apps/server/src/auth/passwords.ts:18-29`.
- What is wrong: "not a common one" is checked against ten strings; `passwordpassword1`,
  `qwertyuiop123`, `welcome12345` and the like pass.
- Suggested fix: the list Mini Games uses (or a few thousand entries of a public breached-password
  list of length 12 or more), shipped as a data file and loaded once.

### 12. low: development accounts with the admin role survive in the database (PLAUSIBLE)

- Where: `apps/server/src/devRoutes.ts:30-45` saves each development account through the account
  store; `apps/server/src/auth/twoFactor.ts:38-39` exempts kind `dev` from 2FA.
- What is wrong: a server that once ran with `SC_DEV=1` on a database keeps every development admin
  and their 7-day sessions after the development features are turned off; those admins reach the
  admin area without 2FA and can promote any local account.
- Suggested fix: refuse sessions of `dev` accounts when `config.dev` is false (in `signedInBy`), and
  let `dev:reset-db` or the start in non-development mode delete `dev` accounts.

### 13. note: the sealed boxes are not bound to their row, and the tag length is not fixed

- Where: `apps/server/src/db/box.ts:22-39`.
- What is wrong: no additional authenticated data names the account or the show, so someone with
  write access to the database can move a TOTP secret box from their own account to an admin's row
  (and then pass the admin's 2FA with their own phone), or move a sealed show's box to another
  show. `setAuthTag` without `authTagLength: 16` lets Node accept shorter tags.
- Suggested fix: `cipher.setAAD(Buffer.from('two_factor:' + accountId))` (and `show:` plus the show
  id), `authTagLength: 16` on both sides, a `v2` box with a migration of existing rows.

### 14. note: smaller points

- `apps/server/src/websiteRoutes.ts:59-71`: a deleted website account gets its current name saved
  again before the 403; the feed's anonymisation then holds only through `deleted`. Skip the save
  for a deleted account.
- `apps/server/package.json` script `sc` loads `dev.env` when present; on a server checkout an
  operator whose shell lacks `SC_DATA_KEY` gets the all-zero development key silently (the start then
  fails on the event log, so nothing is damaged). Prefer no env file for this tool.
- Expired sessions and used or expired reset rows are never deleted in PostgreSQL
  (`apps/server/src/db/accountStore.ts`, `credentialStore.ts`); a periodic cleanup keeps the tables
  small.
- `apps/server/src/localRoutes.ts:141`: a name and an e-mail of one account are two per-login
  buckets (10 tries per address instead of 5); harmless once finding 1 is fixed.

## Checked and found sound

- Session token: 32 random bytes from `node:crypto`, only its sha256 stored (memory and
  `sessions.token_hash`); cookie signed, http-only, `SameSite=Lax`, path the base path, 7 days,
  Secure in website mode; expired sessions refused and removed on lookup.
- Rotation: register, local sign-in (after 2FA), website sign-in and the development sign-in all go
  through `signIn`, which ends the browser's old session first; no half-signed-in state exists for
  2FA (password and code come in one request, no cookie before both pass).
- Website trust: the peer is `request.socket.remoteAddress`, never a forwarding header; the proxy
  secret is compared in constant time after hashing, both checks always run; repeated identity
  headers fail closed; website mode refuses to start without secret, origin and proxies.
- Redirects: `safeNext` keeps `next` under the base path only (no `//`, backslash, dot segments or
  encoded separators); the login hop's path is fixed. No open redirect found.
- Development routes are registered only when local mode, `NODE_ENV=development` and `SC_DEV=1`
  all hold (`config.ts:112`, `app.ts:130`).
- SQL: every statement is parameterised; the only interpolations are a fixed column name, a fixed
  column list and the schema name checked by `SAFE_SCHEMA` before any pool exists.
- Passwords: Argon2id (64 MiB, 3 passes, 1 lane), 12 to 128 characters checked before any hash or
  row; an unknown login verifies a dummy hash of the same parameters; wrong name, wrong password
  and deleted account answer the same 401 text; a broken stored hash is a mismatch, not a 500.
- Forgotten password: the answer is the same for every e-mail and does not wait for the lookup or
  the mail; the token is 32 random bytes, stored as sha256, valid one hour, taken in one atomic
  `UPDATE ... RETURNING`; the password rules are checked before the token is spent; the reset ends
  every session of the account and closes its sockets; the link uses the configured origin, never
  the Host header; an e-mail address cannot carry header line breaks (zod `email`).
- Registration race: a clash between two registrations leaves the losing account deleted, never
  signable.
- 2FA: required by the admin area for local admins; TOTP secrets of 20 bytes sealed with AES-256-GCM
  under `SC_DATA_KEY` (a database URL without the key refuses to start); a step is accepted only
  after the stored one, moved forward in one conditional `UPDATE`; all candidate steps compared in
  constant time; recovery codes are 31^8 per code, stored as sha256, used in one conditional
  `UPDATE`; codes limited to 10 per 15 minutes per account; setup is refused once enabled; the
  otpauth URI is built by the server.
- Admin area: only admins; a website account's role and rank cannot be edited here; an admin cannot
  drop their own admin role; a role change ends the account's sessions and sockets; the account list
  carries no e-mails.
- Account feed: the sync token is sent as a header, the answer is checked field by field, the cursor
  moves only after a page is applied, changes are idempotent; `deleted` anonymises and ends sessions.
- Socket: the handshake reads the session from the cookie, refuses a foreign `Origin`, and a socket
  whose session ends is disconnected; direction messages need an organiser or admin and the domain's
  holder check.
- Content before "Open": "My matches" and every HTTP show answer use `publicView` only; badges are
  restricted to the contract's icon path form, never a URL.
- No `Math.random` outside tests; development credentials (`dev.env`, `ops/compose.dev.env`,
  `e2e/rootAdmin.ts`, CI's `ci-only`) are marked development or test only; compose ports are bound
  to 127.0.0.1; no secret, token or code is written into an answer other than its own owner's.

## Out of scope or for the owner

- Enrolment window: a newly promoted standalone admin signs in with the password alone and may enrol
  any authenticator. Whoever knows the password first owns the admin area. Options: promote with a
  one-time enrolment link, or require the CLI to set up 2FA. Needs a decision.
- No way to disable or reset another admin's 2FA, and no re-issue of recovery codes: an admin who
  loses phone and codes is locked out for good; the only path is the database. Needs a decision.
- Website mode shares one origin with the website and the other games: any script on that origin
  can call these routes with the visitor's cookie. Acceptable only while every page there is
  trusted; a separate origin per game would remove it.
- Registration answers 409 for a taken name or e-mail, which tells whether an e-mail has an
  account. Hiding it needs an e-mail confirmation flow; the trade-off is the owner's.
- Account names accept any Unicode letters without normalisation or a script rule, so `Olga` and an
  `Olga` with a Cyrillic `O` are two accounts that look the same on the board. Decide whether
  names stay Unicode (then NFKC plus a mixed-script rule) or become ASCII.
- SMTP is plain, unauthenticated, without required TLS (`mail.ts`, BACKLOG 11), and the feed's local
  origin may be `http://`: both carry secrets (reset links, the sync token) and belong on a trusted
  local network or behind TLS.
- Brute force of a TOTP code with a known password: 10 tries per 15 minutes per account is about 0.3 %
  a day. This is Mini Games' rule; lowering it or adding an alert on repeated wrong codes is the
  owner's call.

## Outcome (night chain SC-N2 piece 7, same day)

Every finding was fixed except 11, and each fix has a test in
`apps/server/src/securityPass.test.ts` unless named otherwise.

| #   | Outcome                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fixed: Fastify's `trustProxy` is the configured proxies (`SC_TRUSTED_PROXIES` in both modes; locally 127.0.0.1 and ::1 by default), so every limit counts the visitor.                                                                                                                 |
| 2   | Fixed: a confirmation ends every other session of the account (`SessionStore.removeOthers`) and closes their sockets.                                                                                                                                                                  |
| 3   | Fixed: every write must come from this origin (`Origin` against `Host`, as the socket) and not cross-site by `Sec-Fetch-Site`; the `text/plain` parser is removed, so a plain form answers 415. Fastify's own 4xx refusals now keep their status instead of becoming a 500.            |
| 4   | Fixed: the cookie is Secure in website mode and whenever `SC_PUBLIC_ORIGIN` is https.                                                                                                                                                                                                  |
| 5   | Fixed: Fastify's logger at level `error` (no request lines, so no cookies or bodies).                                                                                                                                                                                                  |
| 6   | Fixed: `enable` changes only a row that is not yet enabled, in one transaction with the codes; the second confirmation answers 409. The database's `setUp` leaves an enabled secret alone.                                                                                             |
| 7   | Fixed: a reset marks every other unused link of the account used (`endResets`).                                                                                                                                                                                                        |
| 8   | Fixed: `dev:reset-db` runs only against 127.0.0.1 or localhost on port 5570 (no test: a tool script).                                                                                                                                                                                  |
| 9   | Fixed: a server that sends mail outside development refuses to start without `SC_PUBLIC_ORIGIN`.                                                                                                                                                                                       |
| 10  | Fixed: setup is refused (409) to an account the sign-in does not ask a code of.                                                                                                                                                                                                        |
| 11  | Fixed in SC-N3 piece 1: Mini Games' ten plus the 49 233 entries of `@zxcvbn-ts/language-common` 4.2.0 (MIT), compared in lower case (`auth/passwords.ts`); test in `localRoutes.test.ts`.                                                                                              |
| 12  | Fixed: a development account signs nobody in while the development features are off.                                                                                                                                                                                                   |
| 13  | Fixed: boxes are `v2`, bound to their row as additional data (`show:<id>`, `two_factor:<account id>`), tag length 16; the box test shows a box refused in another row. Only development data had v1 boxes; the development database was reset.                                         |
| 14  | Fixed: a deleted website account is not saved again; `pnpm sc` reads no env file (`pnpm dev:sc` for the development database); expired sessions and spent links are deleted when the database opens. Left: one account's name and e-mail are two per-login buckets (harmless after 1). |

The points under "Out of scope or for the owner" are listed in HANDOVER under the owner's word.

## Status after SC-N3 piece 1 (2026-11-21)

Every finding of the first pass is fixed now (11 in SC-N3 piece 1). Of the owner's list:

- **2FA recovery:** `pnpm sc admin reset-2fa <name>` removes an account's second factor, its
  recovery codes and its sessions; the admin enrols again before the admin area opens
  (`tools/adminCommands.ts`, tested). Re-issuing recovery codes from the page and the enrolment
  window stay with the owner (BACKLOG 29).
- **Names:** a new name is refused when it equals an existing one after NFKC, case folding and the
  removal of diacritics and whitespace (`auth/names.ts`, tested; registration and the promote
  tool). Letters of different scripts that only look alike, and registration's 409 telling that an
  e-mail is taken, stay with the owner (BACKLOG 30).
- The other points of that list are unchanged.

## Second pass: the release candidate (2026-11-22)

An independent review of the whole branch `proto/cases-v1` (`git diff origin/master..HEAD`), done
at `0336ab8` and rechecked at `7ec2336` (that commit changes only docs and versions, no code). It
covered the full current files of `apps/server/src`, `packages/contracts/src`, the domain's
projection, sealing, registration and live rules, `deploy/` (install.sh, admin.sh, lib/*.sh with
the nginx and Caddy route templates), `.github/workflows/*.yml`, and the client's reset page and
chat frame. The standards were CONCEPT §8 and §10, CLAUDE.md, the website's AUTH.md and
GAME-INTEGRATION.md (§2 to §7), and the first pass above (its findings were not reported again;
none regressed). Method: every route and socket handler traced from request to store; the kit
pieces in use (`websiteSignInCheck`, `identityFrom`, `RateLimiter`) read in `node_modules`; the
findings marked CONFIRMED were reproduced with throwaway Vitest probes under `apps/server/src`
(in-memory stores) or in an `ubuntu:24.04` container, all deleted afterwards; `pnpm audit --prod`
reported nothing. Line numbers refer to `7ec2336`.

### Findings

1. **medium: the installed service user owns the code that root later runs (CONFIRMED)**
   - Where: `deploy/lib/app.sh:43` (`chown -R seasonal-cases /opt/seasonal-cases`), `:111`
     (`ReadWritePaths=/opt/seasonal-cases`), `:29` and `:41-42` (root runs `git`, `pnpm install`
     and `pnpm build` in that tree on `--update`), `deploy/admin.sh:22-23` (root runs
     `node --import=tsx src/tools/sc.ts` from it).
   - What is wrong: the game process can write its own code, `node_modules` and `.git` (with
     PostgreSQL the service needs no write access there at all). Root then runs that tree.
   - Failure scenario: a code-execution bug in the Node process (or a dependency compromised at
     run time) writes into `node_modules/tsx` or `src/tools/sc.ts`; the next
     `sudo ./deploy/admin.sh admin promote …` or `install.sh --update` runs it as root. Side
     effect, reproduced in `ubuntu:24.04`: git 2.43 as root refuses the service-owned repository
     ("detected dubious ownership", exit 128, also with `SUDO_UID` set), so `install.sh --update`
     stops at `fetch_code` today; the obvious workaround, `safe.directory`, would also open the
     `.git/config` hook path to root.
   - Fix: keep the code owned by root (give the service only a data folder, if any); drop
     `ReadWritePaths` or point it at that folder; run the admin tool as the service user
     (`runuser -u seasonal-cases`) with the environment passed in.

2. **medium: the rate limits count whole IPv6 addresses; one /64 locks every new visitor out (CONFIRMED)**
   - Where: `apps/server/src/localRoutes.ts:135,140,142,163,173` and
     `apps/server/src/websiteRoutes.ts:95,101` (keys `request.ip`). The kit's `RateLimiter` holds
     at most 100 000 keys and refuses new keys while all are active; its header asks games to key
     IPv6 by /64.
   - What is wrong: a visitor with an IPv6 /64 has 2^64 addresses. The per-address and the
     per-login-and-address limits do not bind them, and the key cap turns that into a lockout.
   - Failure scenario, reproduced: 100 000 sign-in requests with an empty body from
     `2001:db8::0` to `2001:db8::1869f` (through the trusted proxy), then a sign-in from
     `198.51.100.7` answers 429 "too many tries" for the next 15 minutes; registration, forgot and
     reset work the same way. Rotating addresses also gives unlimited password guesses against
     one player or organiser (there is no per-account limit on passwords, and only admins have
     2FA), each guess costing the server one 64 MiB Argon2 hash.
   - Fix: key IPv6 by its /64 (IPv4 as is) in one helper that every limiter uses; add a
     per-account limit on password tries (a soft delay); consider a small concurrency cap on
     Argon2.

3. **medium: one socket message makes the server re-project and re-send the show to every watcher; claims are unlimited too (CONFIRMED)**
   - Where: `apps/server/src/realtime.ts:95-101` (`join` calls `leave`, which pushes, then pushes
     again), `:144-153` (no limit on `show:watch`), `:81-83` (a fresh projection per watcher);
     `apps/server/src/showRoutes.ts:97-102` (claim, no rate limit; every claim is an event kept
     forever and folded into `claims`).
   - What is wrong: any guest may send `show:watch` as fast as the socket carries it, and each one
     costs two full projections and two emits per watcher. A signed-in player may claim without
     limit; each claim is stored, pushed to every watcher, and makes every later projection slower
     (`board` and `standings` walk all claims).
   - Failure scenario, reproduced: 200 `show:watch` messages from one guest made a single other
     watcher receive 399 public views. With a few hundred viewers in a live show, a script
     multiplies that into a flood that stalls the event loop, and with it the direction
     (CONCEPT §8: an ack within 5 s). 300 claims by one player were all accepted and kept; a model
     with 20 000 claims costs about 29 ms per projection, which is seconds per change with 200
     watchers.
   - Fix: a `RateLimiter` per socket (and per address) for `show:watch`; ignore a watch of the
     show already watched; on join push only to the joining socket; a per-player limit on claims
     (and refuse a claim of the case already claimed); compute the public view once per push and
     send it to all public watchers.

4. **low: in the Caddy profile there is no account-changes feed, so a locked or deleted member keeps playing for up to 7 days (CONFIRMED by trace)**
   - Where: `deploy/install.sh:146-154` (`website_feed` only for nginx), `apps/server/src/app.ts:222-233`.
   - What is wrong: with `SC_PROXY=caddy` the installer never writes `SC_WEBSITE_LOCAL_ORIGIN`
     and `SC_GAMES_SYNC_TOKEN`; it prints a warning and the install succeeds. Nothing then ends a
     session when the website locks, demotes or deletes a member (GAME-INTEGRATION §4), and the
     profile card (§7) is off.
   - Failure scenario: a website admin is demoted or locked after abuse; their 7-day game session
     keeps the game's admin area and the direction until it expires.
   - Fix: in the Caddy profile ask for the site's address as this host reaches it and read the
     token file, or refuse to finish without the feed unless the operator says so explicitly; or
     shorten website-mode sessions while no feed is set up.

5. **low: a socket keeps the role it connected with, past session expiry and past the admin tool (CONFIRMED by trace)**
   - Where: `apps/server/src/realtime.ts:122-131,142-143` (`me` read once at the handshake);
     `apps/server/src/tools/adminCommands.ts` (`reset-2fa` removes sessions from another process,
     so the server's `SessionEnds` never fires).
   - What is wrong: only sessions ended inside the server process close sockets. A session that
     expires, or one removed by `admin.sh admin reset-2fa` (the recovery path for a compromised
     admin), leaves its open socket able to direct shows as before.
   - Fix: re-check the session on each direction message (one lookup) or on a timer, and
     disconnect when it is gone.

6. **low: a failed event write is only logged; memory and the log part ways (PLAUSIBLE)**
   - Where: `apps/server/src/db/eventStore.ts:69-84`.
   - What is wrong: the show goes on in memory although the database write failed, and the
     sequence number is already taken. After a restart the show is rebuilt without the lost
     events, for example without its `sealed` event, so it can be sealed again with a new
     assignment and a new commitment after the first commitment was shown (CONCEPT §8).
   - Fix: after a failed append, accept no further commands for that show (or the server) until
     the write succeeds, and say so on `/api/ready`; at least treat a lost `sealed` event as fatal.

7. **note: the nginx sign-in route still forwards the website's session cookie (CONFIRMED by trace)**
   - Where: `deploy/lib/route.sh:60-69` (`location = /games/cases/auth/website` sets no `Cookie`);
     the Caddy template strips it on every path.
   - What is wrong: GAME-INTEGRATION §3 asks the games' route files to strip the website's
     cookies; the nginx file does so everywhere except on the route a member hits at every
     sign-in, so the game server still receives `se.sid` there. The game never logs or uses it.
   - Fix: repeat the three `se.sid` rewrites and `proxy_set_header Cookie $sc_cookie;` in the
     sign-in location (the authorize subrequest keeps the original cookie).

8. **note: smaller installer points (CONFIRMED by trace)**
   - `deploy/install.sh:61`: `--db postgres://user:password@…` puts the database password into
     the process list and the shell history; prefer the answers file or the question.
   - `deploy/lib/app.sh:32`: `SC_REPO` is not checked; a value starting with `-` is read by
     `git clone` as an option (`--upload-pack=…`). Only root gives it, so no boundary is crossed,
     but a `must_match '^(https://|git@|/)'` costs nothing.
   - `deploy/lib/route.sh:145-146`: the site port file is checked only for `:digits` at the end
     before it goes into `proxy_pass`; anchor the check (`^127\.0\.0\.1:[0-9]+$`).
   - `deploy/install.sh:114-115,134-139`: `SC_HOST` and `SC_TRUSTED_PROXIES` are not checked by
     the installer (the server refuses a bad `SC_HOST`, and the route is written only after the
     readiness check, so a bad value cannot reach the route file today).

### Checked and found sound

- Identity headers: read only in `websiteRoutes.ts` on the sign-in route; the TCP peer (never a
  forwarding header) and the proxy secret in constant time; the kit's header list equals the list
  both route templates clear and copy (seven `X-Acting-*`); the secret is cleared on every path,
  never sent to the authorize call, and added only on the exact sign-in path.
- Profile card (§7): 404 on `/games/cases/api/website/` in both templates (nginx decodes and
  merges slashes before it matches), 404 in the server when `X-Forwarded-For` is present (both
  proxies always set it), the sync token in constant time, only ended shows counted.
- Content before "Open": every HTTP answer and socket message goes through `publicView`,
  `organiserView` or `personalView`; an unopened case's artifact, the assignment and the secret
  appear only after "Open" or after the end; "My matches" and the chronicle use the same views; the
  sealed box in PostgreSQL is AES-256-GCM bound to `show:<id>`. That `allPrizesFound` tells that
  the remaining cases are blanks is the concept's "End show" offer (§3.5).
- Sealing: Fisher–Yates over `node:crypto` `randomInt`, a 32-byte secret, sha256 over canonical
  JSON; the seeded stream only in the development Quick Test; no `Math.random` outside tests.
- Writes: the same-origin and `Sec-Fetch-Site` check on every non-GET, the `text/plain` parser
  removed, the socket handshake same-origin; `trustProxy` limited to the configured proxies.
- Config: production refuses to start without `DATABASE_URL`, `SC_DATA_KEY`, a 32-character cookie
  secret and `SC_PUBLIC_ORIGIN`; development routes need local mode, `NODE_ENV=development` and
  `SC_DEV=1`; the log never carries query strings, headers or cookies.
- Installer files: answers parsed, never sourced; values with a quote or a line break refused;
  `cases.env`, `install.conf` and the route file 0600; the database password reaches `psql` on
  stdin; secrets made once with `openssl rand` and never printed; the route checked before the
  reload, the old file restored on failure.
- Workflows: `contents: read` everywhere, only CodeQL with `security-events: write`; actions pinned
  to SHAs and images to digests; CI credentials marked CI-only; gitleaks over the full history.
  `pnpm audit --prod`: no known vulnerabilities.
- Client: the reset token goes only into the POST body; `Referrer-Policy: strict-origin`; the chat
  frame checks origin and window through the kit's `connectChat`; no `innerHTML`.

### For the owner

- Whether website mode may run without the account-changes feed at all (finding 4), or the
  installer should refuse to finish without it.
- Limits for viewers and players (finding 3): how many claims a player may make per show and per
  minute, and how many sockets one address may hold.
- Any organiser may fill free cases with bots (`POST /api/shows/:id/bots`) in production; bots
  then own cases and can hold prizes. Keep it for real shows, or make it development only?
- In the Caddy profile the game binds to the Docker bridge and trusts `172.16.0.0/12`: every
  container on the host counts as a proxy (it still needs the secret or the token). Narrow it to
  the site network's subnet once the website's compose file fixes one.

### Outcome (night chain SC-N3 piece 7, same day)

| #   | Outcome                                                                                                                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fixed: the code in /opt/seasonal-cases stays root's; the service only reads it (no `chown`, no `ReadWritePaths`), so the game process cannot change what root later runs, and git as root no longer refuses the repository. Harness check: no `chown`.                                  |
| 2   | Fixed: every address limit counts an IPv6 visitor by its /64 (`apps/server/src/addressKey.ts`, tested), an IPv4 mapped address as IPv4.                                                                                                                                                 |
| 3   | Fixed: a guest's or player's watch is answered to that socket only (an organiser's still reaches everyone: the hand-over list); at most 10 watches in 10 s per socket; at most 20 claims a minute per player (`securityPass2.test.ts`). The exact numbers are the owner's (BACKLOG 37). |
| 4   | Left for the owner and the website: with the site's Caddy in its container the game cannot reach the site's address (BACKLOG 35).                                                                                                                                                       |
| 5   | Fixed: every direction message reads the socket's session again; one that ended elsewhere is refused, then the socket closes (`securityPass2.test.ts`).                                                                                                                                 |
| 6   | Fixed: an event that cannot be written stops the server at once; systemd restarts it from the database, so no show goes on in memory past its log.                                                                                                                                      |
| 7   | Fixed: the nginx sign-in route strips the website's session cookie as the other route does (harness check: both routes).                                                                                                                                                                |
| 8   | Fixed: `--db` takes only `create` or `url`, the address comes from the answers file or a hidden prompt; `SC_REPO` must be an https://, git@ or /path address; the site port must be `127.0.0.1:<port>`; `SC_HOST` and `SC_TRUSTED_PROXIES` are checked for their form (harness checks). |

The section's points for the owner are in HANDOVER and BACKLOG 35, 37.

## Status after SC-N4 piece 3 (2026-11-22)

The owner decided the open points on 2026-11-22 (DECISIONS D34–D37); built and tested:

- **Recovery codes (D35, BACKLOG 29):** `POST /api/me/2fa/recovery` with the password and a
  current code from the app (the step used up, so it cannot be replayed) answers ten new codes;
  the old ones are void in the same transaction (`TwoFactorStore.replaceRecovery`); the log says
  `recovery-codes-reissued` with the account id, never a code (`twoFactorRoutes.test.ts`,
  `stores.test.ts`). The admin area offers it once two-factor sign-in is set up. The enrolment
  window after a promotion stays, as decided.
- **Names (D36, BACKLOG 30):** 3 to 32 Latin letters (with diacritics), digits, `-` and `_`;
  compatibility forms refused; so no name mixes scripts (`auth/names.ts` `nameAllowed`, applied
  at registration and by `pnpm sc admin promote`, tested). Names made before the rule stay; an
  admin renames them by hand (docs/CONFIG.md, "Account names").
- **Registration (D36, BACKLOG 30):** one answer for a new and a taken e-mail, no session, at
  least 1 s after the request on both paths, the password hashed on both; the mail says the rest
  (the account is ready, or an account exists with the way to sign in). A taken name still answers
  409: names are public on every board (`localRoutes.test.ts`).
- **Limits (D37, BACKLOG 37):** 20 claims a minute per player and 10 watches in 10 s per socket
  stay; new: 60 a minute per address (IPv6 /64) for claims and sign-ins together, after each
  route's own limits (`addressLimit.ts`, `securityPass2.test.ts`). Bots: development and the
  Quick Test only (D34, `showRules.test.ts`). The Caddy profile asks for the trusted range with
  172.16.0.0/12 as the default, remembers it and names it in the route file (installer harness).

## Third pass: SC-N4 (2026-11-23)

A fresh review agent that had not seen the chain reviewed `cc75504..db03755` and, in full, the
auth files, the limiters, the registration, two-factor, realtime, show and organiser routes,
the configuration and the two PostgreSQL stores, against CONCEPT §8 and §10, CLAUDE.md, the
website's AUTH.md and DECISIONS D34–D39. Read-only; one throwaway script tested the name rule.

### Findings

1. **High: a socket message without its ack stopped the server** (CONFIRMED). socket.io hands a
   handler `undefined` for the ack when the packet has none; every handler called it, the throw
   (or the rejected promise in the direction handlers) was not caught, and the process exited.
   Anyone, a guest included, could send it. `show:applaud` was new; `show:watch` and the
   direction messages had it since SC-N1.
2. **Medium: registration still tells whether an e-mail has an account, by what it leaves
   behind** (CONFIRMED). The answer is the same, but a new e-mail makes an account at once:
   signing in with it afterwards, or registering the same name again, tells the two apart.
3. **Low: the name rule took Latin-script look-alikes** (CONFIRMED): `ɡame`, `ǀeo`, `ɑdmin`,
   `ᴀdmin`, `admɪn`, `ꜱam`, `ɩvo` passed beside their ASCII twins; `---` passed (no letter).
4. **Low: a re-issue of recovery codes left the other sessions open** (CONFIRMED).
5. **Low: registration mail** (CONFIRMED): a name lost in a race got the "an account exists"
   mail; one address could get any number of mails from many networks.
6. **Note: applause**: the 5 a second is per socket, so many sockets raise the confetti (cosmetic);
   a tally stays in memory after its show ends (bounded).

### Checked and found sound

The test-only cookie switch (refused outside NODE_ENV=test, which is never production); bots
only in development; the re-issue route (session, per-account limit, Argon2, one 401 for both
wrong answers, the TOTP step used up by a conditional update, one transaction, no codes logged);
the registration's same answer and 1 s floor; the name rule's NFC and NFKC handling; the
address budget's keys and order; applause only for watchers of a live show, sent only to them,
no event; no unopened content in the new code; no `Math.random`; parameterised SQL.

### Outcome (same night)

| #   | Outcome                                                                                                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fixed: every socket drops a message that is not a request and an ack before any handler (`realtime.ts`); test sends each event without an ack and with the ack in the request's place, then the server still answers (`securityPass2.test.ts`). Sabotage probe: without the guard the test run stops with 14 uncaught errors. |
| 2   | For the owner: the owner's piece 3 asked that a new e-mail take "the usual flow", which makes the account at once; closing this needs an e-mail confirmation before an account exists, a change to decided behaviour. Left as built; in HANDOVER and the morning sheet.                                                       |
| 3   | Fixed: the rule allows the Latin letter blocks with diacritics only (Basic Latin, Latin-1, Extended-A, Extended-B without the click letters, Extended Additional); the seven look-alikes are in the test. Whether a name needs a letter is the owner's.                                                                       |
| 4   | Fixed: a re-issue ends the account's other sessions (`twoFactorRoutes.test.ts`).                                                                                                                                                                                                                                              |
| 5   | Fixed: a name lost in a race answers 409 and mails nobody; one address gets 3 mails an hour at most from registration and from the forgotten password (`localRoutes.test.ts`).                                                                                                                                                |
| 6   | Noted, unchanged: cosmetic and bounded.                                                                                                                                                                                                                                                                                       |

Scans: `pnpm audit --prod` no known vulnerabilities; osv-scanner (CI's v2.7.0 image) 467
packages, no issues; gitleaks over the full history (38 commits) no leaks.

### For the owner

- An e-mail confirmation before an account exists (finding 2), or the side channel as it is.
- Whether a name needs at least one letter (`---` passes today).
- Applause per account or address instead of per socket; whether guests may applaud.
- The address budget of 60 a minute is shared by claims and sign-ins: a room of more than about
  60 players behind one public address may meet it; separate budgets or a higher number?

## Status after SC-D5 piece 3 (2026-11-23)

The owner's proposals of 2026-11-23 (DECISIONS D42–D45) answer the third pass's questions for
the owner; built and tested:

- **Registration with confirmation (D42, finding 2):** the form makes no account, only a
  registration waiting for its link (`auth/pending.ts`, `db/pendingStore.ts`, migration 0003):
  the name, the e-mail key, the Argon2id hash, the token's sha256, 24 hours. The link makes the
  account once; a used, replaced or expired link is refused. A sign-in with a name or e-mail whose
  link was not used answers as for any unknown one, so registering no longer tells whether an
  e-mail was free. One registration per e-mail: a second one answers the same, and mails a new link
  no sooner than a minute later. Names are reserved only by accounts: the first link used wins,
  the other answers 409 at the link. Without mail set up, registration answers 503.
  `registerRoute.test.ts`, `stores.test.ts`, journey 5.
- **A letter in every name (D43, finding 3):** `---`, `123` and `1-2_3` are refused
  (`names.test.ts`, `registerRoute.test.ts`).
- **Applause per account or address (D44, finding 6):** 5 a second per account for a signed-in
  viewer, per address (IPv6 /64) for a guest; guests may applaud. More tabs or sockets add
  nothing. A socket's address is its peer, or the last `X-Forwarded-For` entry when the peer is a
  trusted proxy (`socketAddress.ts`, using the kit's `trustedPeers`). Tests:
  `applause.test.ts`, `socketAddress.test.ts`.
- **Separate address budgets (D45):** sign-ins 20 a minute per address and claims 300 a minute,
  each its own bucket (`addressLimit.ts`), so claims never use up sign-ins. The sign-in's own
  per-address limit of 20 per 15 minutes is replaced by the 20 a minute: with it, a room of more
  than 20 players on one network could not all sign in within a quarter of an hour. The
  per-login (5 per 15 minutes), per-player (20 claims a minute) and per-socket (10 watches in
  10 s) limits stay. Tests: `securityPass2.test.ts`.
- **Kit v0.11.0 (D40):** recovery codes are HMAC-SHA-256 with `SC_RECOVERY_KEY`, their own
  secret, never `SC_DATA_KEY` (kit K20). Codes stored as plain SHA-256 before keep working until
  used, through the kit's second lookup (kit K27; `stores.test.ts`).
