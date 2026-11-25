# Operations of Seasonal Cases

What is Cases' own beside the kit's `docs/OPERATIONS.md` (backups, restore and the drill). How to set
up, pull and restore is in [INSTALL.md](INSTALL.md) ("Backups").

## What a Cases backup holds

| Part                | In Cases                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Database            | PostgreSQL, schema `sc` (`SK_BACKUP_DB_SCHEMA=sc`), dumped with the client tools on the host (`SK_BACKUP_DB_URL`, the password in `PGPASSWORD`) |
| Volumes             | none: the game keeps no uploads                                                                                                                 |
| Secret files        | `/etc/seasonal-cases/cases.env` (data, cookie, recovery and proxy secrets, the sync token, the database address and password)                   |
| Prefix, environment | `cases`, `prod`                                                                                                                                 |
| Schedule            | `cases-backup@prod.timer`, 03:30                                                                                                                |

The installer fits two lines of the kit's printed systemd units to a server without Docker: they wait
for `postgresql.service` instead of requiring `docker.service`, and run the script with `bash` from
the installed code.

## Restore drills

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
