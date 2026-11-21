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
| 11  | Left: the ten entries are Mini Games' list, whose rules the task names; a longer list is for the owner (HANDOVER).                                                                                                                                                                     |
| 12  | Fixed: a development account signs nobody in while the development features are off.                                                                                                                                                                                                   |
| 13  | Fixed: boxes are `v2`, bound to their row as additional data (`show:<id>`, `two_factor:<account id>`), tag length 16; the box test shows a box refused in another row. Only development data had v1 boxes; the development database was reset.                                         |
| 14  | Fixed: a deleted website account is not saved again; `pnpm sc` reads no env file (`pnpm dev:sc` for the development database); expired sessions and spent links are deleted when the database opens. Left: one account's name and e-mail are two per-login buckets (harmless after 1). |

The points under "Out of scope or for the owner" are listed in HANDOVER under the owner's word.
