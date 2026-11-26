# Operating Seasonal Cases on a server

This guide installs, updates, backs up and removes the game on your own server. Every command in a
box is typed exactly as shown; replace only what stands in `<…>` with your own value. Each step says
what you should see. The game runs in **Docker** (the game and its PostgreSQL database as containers);
this is the only way it runs on a server.

1. [What to prepare](#1-what-to-prepare)
2. [Install standalone](#2-install-standalone)
3. [Install inside the website](#3-install-inside-the-website)
4. [Update](#4-update)
5. [Backup, restore and the drill](#5-backup-restore-and-the-drill)
6. [Uninstall](#6-uninstall)
7. [When something fails](#7-when-something-fails)

## 1. What to prepare

- A server with **Ubuntu 24.04** (or Debian 12) you can reach over SSH with `sudo`, about 2 GB of
  free memory and 10 GB of free disk.
- **Docker with its compose plugin.** On the server:

  ```sh
  docker compose version
  ```

  If that is not found, install it:

  ```sh
  sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
  ```

  (or Docker's own packages, <https://docs.docker.com/engine/install/>). The installer does not
  install Docker.

- **Your e-mail address** as the operator. The installer asks for it once (it is kept in
  `/etc/seasonal/operator.env` for every Seasonal installer) and the privacy page names it.
- **Your backup key**, made once on your own computer, never on the server. Install
  [age](https://age-encryption.org), then:

  ```sh
  age-keygen -o cases-backup-key.txt
  age-keygen -y cases-backup-key.txt
  ```

  The second command prints your **public** key, a line starting `age1`. Keep
  `cases-backup-key.txt` somewhere safe: without it no backup can be opened. The installer asks for
  the public key only. Without a key the game installs, but nothing is backed up and updates are
  refused.

- **Sign in to the server** (in an SSH app such as Termius: open the host, then the terminal) and
  **get the code** once:

  ```sh
  sudo apt-get update && sudo apt-get install -y git
  git clone https://github.com/weudlll-cyber/seasonal-cases.git
  cd seasonal-cases
  ```

## 2. Install standalone

Standalone, the game has its own accounts and its own address. You need a domain name pointing at
the server and a reverse proxy on the server that does HTTPS and forwards to the game (Caddy, nginx,
…). The game itself listens on `127.0.0.1:3970` only.

1. Run the installer and answer its questions; Enter takes the value in brackets:

   ```sh
   sudo ./ops/install.sh
   ```

   It asks for: the mode (`local`), the port (`3970`), where to fetch the code and which version
   (a tag or branch), your backup public key (`age1…`; `none` means **no backup**, and it says so),
   the address players open (`https://cases.example.org`), your proxy's address as the game sees it
   (the default is right for a proxy on this server), an SMTP relay for the account mails (or
   `none`: then nobody can register), and your e-mail address.

   It builds the game (a few minutes the first time), starts it and waits. You should see
   `built seasonal-cases:<commit>-local (version …)`, then
   `ready after … s: {"status":"ready",…}`, the lines starting `host:` about the firewall, security
   updates and fail2ban, and last `done (… change(s))`. Secrets are made once, kept in
   `/etc/seasonal-cases/prod.env` and the keys in `/etc/seasonal-cases/prod.keys` (both root only),
   and never printed.

   **Server security (standalone only):** the installer turns on the firewall (SSH's own port, 80
   and 443 allowed), automatic security updates and a fail2ban jail for SSH, each only where it is
   missing. It never changes your SSH settings; it only advises. A firewall at your hosting
   provider must allow the same ports.

2. Check it:

   ```sh
   sudo scases status
   ```

   You should see both containers `Up … (healthy)` and `health:      ready`.

3. Point your proxy at the game. For Caddy:

   ```text
   cases.example.org {
       reverse_proxy 127.0.0.1:3970
   }
   ```

   Open `https://cases.example.org`: the start page with "Sign in".

4. Make the first admin. Register on the page (a mail with a link arrives), then:

   ```sh
   sudo scases admin promote <your name>
   ```

   Sign in again, open Admin, set up two-factor sign-in with an authenticator app, and keep the ten
   recovery codes. A lost phone and lost codes:

   ```sh
   sudo scases admin reset-2fa <name>
   ```

   then set it up again.

5. [Make the first backup and pull it](#5-backup-restore-and-the-drill) before any real player.

**Unattended:** copy `ops/answers.example` to `my-answers`, fill it in, and run

```sh
sudo ./ops/install.sh --answers my-answers --email <your address> --yes
```

A missing answer then stops the run and names the flag or key to give.

## 3. Install inside the website

Inside the Seasonal Entertainment website the game lives at `/games/cases/` and uses the website's
sign-in. The website must be installed and running on the same server and prepared for Cases (its
`deploy/install.sh --update --cases`; its docs/DEPLOYMENT.md, "Embedded games").

1. Run the installer:

   ```sh
   sudo ./ops/install.sh --mode website
   ```

   It asks for: the port, the code and version, your backup public key, the website's address, its
   proxy (`nginx` or `caddy`) and routes folder, and your e-mail address. It joins the website's
   Docker network and writes **only its own route file** into the website's routes folder, which the
   website's proxy checks before a reload (a refused file is taken back).

   You should see `ready after … s`, `route: …, the website's … reloaded`,
   `ready through the website: …`, a `host:` line saying the website's installer owns the server's
   security, and `done (… change(s))`.

2. In the website's Admin → Games, add the game's card (path `/games/cases`), then open the game
   from the website.

3. If the installer said `no account-changes feed`, switch Cases on in the website and run
   `sudo ./ops/install.sh --yes` again.

4. [Make the first backup and pull it](#5-backup-restore-and-the-drill).

## 4. Update

A new version, by its tag or branch:

```sh
sudo scases update <tag>
```

It builds the new version while the old one keeps running (a failed build changes nothing), **backs
up** (it stops if the backup fails), switches and waits until the game is ready. Then try the game:

```sh
sudo scases confirm
```

if it works (this deletes the plain copy of the data kept for going back), or

```sh
sudo scases rollback
```

to go back. A rollback keeps the data as it is, unless the update changed the database's structure:
then it asks, and the data goes back to the moment before the update. Until you confirm or roll
back, no further update is accepted.

**Changing an answer** (the port, the mail relay, the backup key, the operator's address): run the
installer again with the flag, or without `--yes` and answer again. With the same answers it changes
nothing.

```sh
sudo ./ops/install.sh --check
```

says what a run would change and how the game is, and changes nothing.

| What                   | Command                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| State, health, backups | `sudo scases status`                                                         |
| Logs                   | `sudo journalctl --namespace=seasonal-cases -n 100`                          |
| Start (again)          | `sudo scases start`                                                          |
| Containers             | `sudo docker compose -p seasonal-cases ps`                                   |
| Health from the server | `curl http://127.0.0.1:3970/healthz` (website mode: `…/games/cases/healthz`) |

The answers are in `/etc/seasonal-cases/install.conf`. **Logs and privacy:** the containers log into
their own journal namespace, `seasonal-cases`, which keeps them for 14 days
(`/etc/systemd/journald@seasonal-cases.conf`, `MaxRetentionSec=14day`); Docker keeps no second copy.

**The database's two roles:** the migrations run as `sc_owner` (the one-shot container `migrate`),
the running game connects as `sc_app`, which can only read and write rows. The installer, `scases
update`, `scases start` and a restore set them up; an older database is converted by the same step.

## 5. Backup, restore and the drill

Set up by the installer when it has your public key. Every night at 03:30 the server writes one
encrypted file into `/var/backups/seasonal-cases/prod` (`cases-prod-<UTC time>.tar.age`):

| Part         | In Cases                                                                              |
| ------------ | ------------------------------------------------------------------------------------- |
| Database     | a dump from the stack's database container (`seasonal-cases-postgres-1`), schema `sc` |
| Volumes      | none: the database goes as the dump, the game keeps no uploads                        |
| Secret files | `/etc/seasonal-cases/prod.keys`: the data, cookie and recovery keys                   |
| Manifest     | prefix `cases`, environment `prod`, the time, the parts                               |
| Schedule     | `cases-backup@prod.timer`, the kit's units as it prints them                          |

The 14 newest files are kept, and of older ones the newest of each of 8 weeks. Settings:
`/etc/seasonal-cases/backup.conf` (root only). A failed backup shows in `sudo scases status` and in
`sudo journalctl -u cases-backup@prod`. The script is the kit's `ops/backup.sh`
([its docs/OPERATIONS.md](https://github.com/weudlll-cyber/seasonal-kit/blob/v0.32.0/docs/OPERATIONS.md)),
copied out of the game's image to `/opt/seasonal-cases/kit`.

**Back up now** (and see the next scheduled run):

```sh
sudo scases backup
sudo systemctl list-timers cases-backup@prod.timer
```

You should see `backup written: cases-prod-<time>.tar.age`.

**Pull to your own computer.** Add your SSH user to the group once:

```sh
sudo usermod -aG cases-backup <user>
```

then, from a clone of this repository on your computer after `pnpm install`, on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File node_modules\@seasonal\kit\ops\pull-backups.ps1 -Server <user@server> -RemoteDir /var/backups/seasonal-cases/prod -Prefix cases
```

and on Linux or macOS
`node_modules/@seasonal/kit/ops/pull-backups.sh <user@server> /var/backups/seasonal-cases/prod cases [folder]`.

**Drill (does the file restore?)** On the server, with your private key copied there for the moment:

```sh
sudo scases restore --drill <file> --identity cases-backup-key.txt
```

It restores into a throw-away database and compares every table; the game keeps running. You should
see each table's row count and `drill passed`. On a Linux or macOS computer with Docker the same
works from a clone:

```sh
SK_BACKUP_PREFIX=cases SK_BACKUP_ENV=prod SK_BACKUP_PG_IMAGE=postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24 \
  bash node_modules/@seasonal/kit/ops/backup.sh drill <file> --identity cases-backup-key.txt
```

(`backup` itself needs Linux: on Windows a drill runs in a Linux container.)

**Restore** (everything since that backup is lost). Copy the file and your key to the server for the
moment, then:

```sh
sudo scases restore <file> --identity cases-backup-key.txt
```

It asks first (`y` and Enter), stops the game, replaces the database in one transaction, puts the
backup's keys back into `/etc/seasonal-cases/prod.keys` and starts the game again with its database
roles. If the backup's keys differ from the server's, it refuses and changes nothing: that is right
when the file is not the one you meant. Delete your key from the server afterwards.

**On a new server** run the installer (section 2 or 3), which makes keys of its own, then restore
with `--force-env`, which lets the backup's keys replace them (the data can be read only with the
keys it was sealed with):

```sh
sudo scases restore <file> --identity cases-backup-key.txt --force-env
```

`--force-env` also accepts a backup of another environment, so check the file's name first
(`cases-prod-…`).

### Drills done

| Date       | Where                                                     | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-26 | a copy of the development data on the owner's PC (SC-N13) | `scases backup` (30920 bytes, with the keys' file); a restore with differing keys refused, nothing replaced; forced, and again with the keys' file removed (ready after 43 s and 44 s): counts equal, `prod.keys` byte for byte, the ended show's view equal and verified.                                                                                                                                                                                 |
| 2026-11-26 | a copy of the development data on the owner's PC (SC-N12) | Loaded as an older install, converted to the two database roles and migrated (10 s); `scases backup` (30920 bytes, 0.5 s), `scases restore --drill` passed (10 tables, 12 s); events and accounts deleted, `scases restore` (ready after 17 s); `scases update` (51 s) and `scases rollback` with the data restored (20 s), then update and confirm: every row count equal each time and the ended show's view equal byte for byte (8163 bytes, verified). |
| 2026-11-25 | the compose stack on the owner's PC (SC-N11)              | A whole show first (5 cases, 2 prizes, registered accounts), then backup (30920 bytes, 5.1 s), kit drill passed (10 tables, 31 s), database volume removed, a fresh stack (healthy in 35 s), restore (healthy after 24 s): every row count equal, players signed in, the show's view equal, its result verified with the same commitment.                                                                                                                  |
| 2026-11-25 | the development database, into a copy (SC-N10)            | Backup (41160 bytes, 2.1 s), kit drill passed (11 tables, 34 s), restore into a scratch database twice: every row count and the secret file equal, the ended show's view equal and verified. One empty schema left by an interrupted test run was found by the drill and dropped.                                                                                                                                                                          |

## 6. Uninstall

```sh
sudo scases uninstall
```

It asks you to type the environment's name, `prod`, then removes the game's containers, its database,
its backup timer, settings, route file (website mode), journal setting, images, command and folders.
**The backups stay** in `/var/backups/seasonal-cases/prod`; so do Docker, the backup group and the
operator's address. To delete the backups too (they cannot be made again):

```sh
sudo scases uninstall --purge-backups
```

The settings and keys go with an uninstall: only a backup (which carries the keys) or your own copy
of `prod.keys` makes the data readable afterwards.

## 7. When something fails

| What you see                                      | What to do                                                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `STOP: Docker with its compose plugin is needed`  | Install Docker (section 1), run the installer again.                                                                       |
| `the game did not become ready within 120 s`      | `sudo journalctl --namespace=seasonal-cases -n 50` shows why; fix it, run the installer again.                             |
| `health: NOT READY` in `scases status`            | `sudo scases start`; then the logs.                                                                                        |
| An update failed after `Backup before the update` | `sudo scases rollback`.                                                                                                    |
| `the last update is not confirmed yet`            | `sudo scases confirm` if the game works, else `sudo scases rollback`.                                                      |
| `the website's proxy did not take the route`      | The earlier route is back and nothing was reloaded; the message above it names the proxy's complaint (the website's side). |
| `the website's … container … is not running`      | Start the website first.                                                                                                   |
| The backup failed (`scases status` says so)       | `sudo journalctl -u cases-backup@prod`; then `sudo scases backup`.                                                         |
| `NO BACKUP is set up`                             | Run the installer again with `--backup-recipient age1…`.                                                                   |
| No registration mail arrives                      | Check the SMTP relay answers (`sudo ./ops/install.sh`, answer them again) and the logs.                                    |

Old images are removed by `scases update` and `confirm`. The installer never installs Docker, never
changes the website's own files, never prints a secret, and the website-only path
(`/games/cases/api/website/`) is refused by the game to anyone coming through a proxy.

Every setting is in [CONFIG.md](CONFIG.md).
