# Operations of Seasonal Cases

What is Cases' own beside the kit's `docs/OPERATIONS.md` (backups, restore and the drill). How to set
up, pull and restore is in [INSTALL.md](INSTALL.md) ("Backups").

## What a Cases backup holds

| Part                | In Cases                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Database            | PostgreSQL in the compose stack's container (`SK_BACKUP_DB_CONTAINER=seasonal-cases-postgres-1`), schema `sc` |
| Volumes             | none to back up: the database goes as a dump; the game keeps no uploads                                       |
| Secret files        | `/etc/seasonal-cases/cases.env` (every secret, the database password among them)                              |
| Prefix, environment | `cases`, `prod`                                                                                               |
| Schedule            | `cases-backup@prod.timer`, 03:30; the kit's units as it prints them                                           |

## Restore drills

### 2026-11-25, the compose stack on the owner's PC (night chain SC-N11)

The image built from the branch, `ops/compose.yml` in local mode as project `sc-p4`, the game on
`127.0.0.1:3999`, the game's network `172.30.252.0/24`, a throw-away Mailpit on that network
(API on `127.0.0.1:8579`) for the account mails, settings with fresh test secrets in a git-ignored
file. The development stack kept running. Docker Desktop on Windows; the kit's script ran in a
throw-away Linux container (`docker:cli` with `age`, `bash`, `tar`, `coreutils`, `findutils`) with
the Docker socket, with the installer's settings under the proof's names.

**The show first.** An admin and three players registered by mail; `admin promote` ran inside the
game's container; the admin set up two-factor sign-in; a show of 5 cases and 2 prizes went through
registration, three claims, sealing (bots refused, 403) and start; all five cases were opened
through the three steps; the result showed **verified** with the commitment the stage had shown
(`cdf67cbb1297…`), one prize won, one not won. The development sign-in answered 404.

| Step                       | Command (short)                                                       | Result                                                                                        |
| -------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Script                     | `docker run … --entrypoint cat <image> …/ops/backup.sh`               | 384 lines, as the installer copies it                                                         |
| Rows before                | `select count(*)` per table                                           | accounts 4, show_events 30, local_credentials 4, sessions 4, two_factor 1, recovery_codes 10  |
| Backup                     | `backup.sh backup` (`SK_BACKUP_DB_CONTAINER=sc-p4-postgres-1`)        | `cases-prod-20261125T222122Z.tar.age`, 30920 bytes, 5.1 s                                     |
| Kit drill                  | `backup.sh drill <file> --identity key.txt`                           | passed: 10 tables, every row count equal, 1 secret file; 31 s                                 |
| The server lost            | `docker compose down`, `docker volume rm sc-p4_pgdata`, settings gone | volume removed                                                                                |
| Settings out of the backup | `age -d -i key.txt <file> \| tar -x ./secret-cases.env`               | byte for byte the stack's settings                                                            |
| Fresh stack                | `docker compose up -d --wait`                                         | healthy in 35 s, no accounts, no shows                                                        |
| Restore                    | `backup.sh restore <file> --identity key.txt --secrets-to … --yes`    | stopped the game, restored, started it; healthy after 24 s; the settings file identical       |
| Proof                      | row counts, the browser                                               | every row count equal; three players signed in (two by e-mail, so the restored data key       |
|                            |                                                                       | opens the addresses); the admin was asked for the second factor; the show's whole view equal; |
|                            |                                                                       | the result **verified** with the same commitment                                              |
| Cleanup                    | `down -v`, the test containers, images and files, the age key         | nothing left                                                                                  |

Not drilled: the installer, the systemd timer, the journal logging and website mode on a real Linux
host (BACKLOG 34, 64).

### 2026-11-25, the dev stack (night chain SC-N10)

A test age key made for the drill and deleted afterwards. The kit's script ran in a throw-away
Linux container (`postgres:17-alpine` with `age`, `bash`, `tar`) on the dev database's network, with
`SK_BACKUP_DB_URL` as the installer writes it; the secret file was a stand-in (`cases.env` with one
test line). Its `backup` command does not run in Git Bash on Windows (`install -m` cannot change
permissions there); its `drill` command did, from the host.

| Step                           | Command (short)                                                                   | Result                                                                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rows before                    | `select count(*)` per table                                                       | accounts 4, show_events 71, local_credentials 1, sessions 2, schema_migrations 4, the rest 0                                                                                        |
| Backup                         | `backup.sh backup`                                                                | `cases-drill-….tar.age`, 41160 bytes, 2.1 s                                                                                                                                         |
| Kit drill                      | `backup.sh drill <file> --identity key.txt`                                       | passed: 11 tables, every row count equal, 1 secret file; 34 s                                                                                                                       |
| Scratch database `sc_drill`    | `restore … --yes --secrets-to`, then `DROP SCHEMA sc CASCADE`, then restore again | restored in 1.8 s; every row count equal to the original; the secret file identical                                                                                                 |
| Server on the copy (port 3971) | `/api/health`, `/api/shows`, `/api/shows/show-8f25bfc1`                           | health ok (1.1.0-rc.2, db ok); the show list equal; the ended show's whole view equal; its commitment `a2e190f3…` equal and **verifies** against the restored assignment and secret |
| Cleanup                        | drop `sc_drill`, remove the container, delete the files and the key               | done                                                                                                                                                                                |

The dev database also held one empty schema left by an interrupted local test run
(`t_ee05098e8012`, one empty table); it was dropped. The kit's drill counted it, which is how it was
seen.

Not drilled: the installed server's timer and `--force-env` on a real VPS (there is none yet).
