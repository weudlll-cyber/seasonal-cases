# Installing Seasonal Cases on a server

One call installs the game on a Debian or Ubuntu server. It runs in **Docker**: the game and its
PostgreSQL database as two containers (`ops/compose.yml`), built on the server from the version you
choose. This is the only way the game runs on a server. Each step below says what to type and what
you should see.

## What you need

- A Debian 12 or Ubuntu 24.04 server you can reach over SSH, with `sudo`, about 2 GB of free memory
  and 10 GB of free disk.
- **Docker with its compose plugin.** Check with `docker compose version`. If it is missing:

  ```sh
  sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
  ```

  (or Docker's own packages, <https://docs.docker.com/engine/install/>).

- **Standalone** (`local` mode, own accounts): a domain name pointing at the server and a reverse
  proxy on the server that terminates HTTPS and forwards to the game (Caddy, nginx, …). The game is
  published on `127.0.0.1:3970` only.
- **Under the Seasonal Entertainment website** (`website` mode, `/games/cases/`): the website
  installed and running on the same server and prepared for Cases (its `deploy/install.sh --update
--cases`; its docs/DEPLOYMENT.md, "Embedded games"). The game joins the website's Docker network
  and writes only its own route file into the website's routes folder.

## Step by step

1. **Sign in to the server** (in an SSH app such as Termius: open the host, then the terminal).

2. **Make your backup key on your own computer** (once, before the installer): install
   [age](https://age-encryption.org), then

   ```sh
   age-keygen -o cases-backup-key.txt
   age-keygen -y cases-backup-key.txt
   ```

   The second command prints your **public** key, a line starting `age1`. Keep
   `cases-backup-key.txt` somewhere safe and **never on the server**: without it a backup cannot be
   opened. The installer asks for the public key only.

3. **Get the code** on the server (once):

   ```sh
   sudo apt-get update && sudo apt-get install -y git
   git clone https://github.com/weudlll-cyber/seasonal-cases.git
   cd seasonal-cases
   ```

4. **Run the installer** and answer its questions; Enter takes the value in brackets:

   ```sh
   sudo ./deploy/install.sh
   ```

   It asks for: the mode (`local` or `website`), the port (`3970`), where to fetch the code and which
   version (a tag or branch), your backup public key (`age1…`; `none` means **no backup**, and it
   says so), and then
   - local mode: the address players open (`https://cases.example.org`), your proxy's address as the
     game sees it (the default is right for a proxy on this server), and an SMTP relay for the
     account mails (or none: then nobody can register);
   - website mode: the website's address, its proxy (`nginx` or `caddy`) and routes folder.

   It then builds the game (a few minutes the first time), starts it and waits. You should see
   `built seasonal-cases:<commit>-<mode> (version …)`, then `ready after … s: {"status":"ready",…}`,
   then `done (… change(s))`. Secrets are made once, kept in `/etc/seasonal-cases/cases.env` (root
   only) and never printed.

5. **Check it:**

   ```sh
   sudo ./deploy/install.sh --check
   ```

   You should see both containers `Up … (healthy)` and `ready: {"status":"ready",…}`.

6. **Standalone only: point your proxy at the game.** For Caddy:

   ```text
   cases.example.org {
       reverse_proxy 127.0.0.1:3970
   }
   ```

   Open `https://cases.example.org`: the start page with "Sign in".

7. **Standalone: make the first admin.** Register on the page (a mail with a link arrives), then

   ```sh
   sudo ./deploy/admin.sh admin promote <your name>
   ```

   Sign in again, open Admin, set up two-factor sign-in with an authenticator app, and keep the ten
   recovery codes. A lost phone and lost codes: `sudo ./deploy/admin.sh admin reset-2fa <name>`,
   then set it up again.

8. **Website mode:** add the game's card in the website's Admin → Games (path `/games/cases`), then
   open the game from the website.

9. **Make the first backup and pull it** (before any real player):

   ```sh
   sudo ./deploy/backup.sh backup
   sudo systemctl list-timers cases-backup@prod.timer
   ```

   You should see `backup written: cases-prod-<time>.tar.age`, and the timer's next run at 03:30.
   Then pull it to your computer and run the drill below once.

## Later

| What                               | Command                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Health of the stack                | `sudo ./deploy/install.sh --check`                                           |
| What an update would change        | `sudo ./deploy/install.sh --check --ref v1.1.0`                              |
| Update to a tag or branch          | `sudo ./deploy/install.sh --update --ref v1.1.0`                             |
| Re-run with the remembered answers | `sudo ./deploy/install.sh --yes`                                             |
| Logs                               | `sudo journalctl --namespace=seasonal-cases -n 100`                          |
| Containers                         | `sudo docker compose -p seasonal-cases ps`                                   |
| Stop, start                        | `sudo docker compose -p seasonal-cases stop`, `… start`                      |
| Health from the server             | `curl http://127.0.0.1:3970/healthz` (website mode: `…/games/cases/healthz`) |

`--update` **backs up first** (it stops if the backup fails), fetches the tag or branch, builds the
new image and restarts the stack; the game migrates the database on start. The answers live in
`/etc/seasonal-cases/install.conf`; change one with its flag (`--port 3971`) or by answering again.
Old images stay until you remove them (`sudo docker image prune`).

**Logs and privacy.** Both containers log into their own journal namespace, `seasonal-cases`, which
keeps them for 14 days (`/etc/systemd/journald@seasonal-cases.conf`, `MaxRetentionSec=14day`);
Docker keeps no second copy. The privacy page names the contact from the answer `SC_PRIVACY_CONTACT`
(a name or an address; empty: "the operator of this site").

## Backups

Set up by the installer when it has your public key (DECISIONS D68; the kit's `docs/OPERATIONS.md`
describes the script, which the installer copies out of the game's image to
`/opt/seasonal-cases/backup.sh`). Every night at 03:30 the server writes one encrypted file into
`/var/backups/seasonal-cases/prod` (`cases-prod-<UTC time>.tar.age`): the database dump, the
settings file with every secret (`cases.env`: without the data and recovery keys a restored database
cannot open what it sealed) and a manifest. The game keeps no uploads. The 14 newest files are kept,
and of older ones the newest of each of 8 weeks. Settings: `/etc/seasonal-cases/backup.env` (root
only). A failed backup is logged (`sudo journalctl -u cases-backup@prod`).

**Pull to your own computer.** Add your SSH user to the group once
(`sudo usermod -aG cases-backup <user>`), then from a clone of this repository after `pnpm install`,
on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File node_modules\@seasonal\kit\ops\pull-backups.ps1 -Server <user@server> -RemoteDir /var/backups/seasonal-cases/prod -Prefix cases
```

and on Linux or macOS
`node_modules/@seasonal/kit/ops/pull-backups.sh <user@server> /var/backups/seasonal-cases/prod cases [folder]`.

**Drill (does the file restore?)** on a computer with Docker, with your private key; it restores
into a throw-away PostgreSQL container and compares every table:

```sh
SK_BACKUP_PREFIX=cases SK_BACKUP_ENV=prod SK_BACKUP_PG_IMAGE=postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24 \
  bash node_modules/@seasonal/kit/ops/backup.sh drill <file> --identity cases-backup-key.txt
```

You should see each table's row count and `drill passed`.

**Restore** (everything since that backup is lost). Copy the file and your key to the server for the
moment, then:

```sh
sudo ./deploy/backup.sh restore <file> --identity cases-backup-key.txt --secrets-to /etc/seasonal-cases
```

It asks first, stops the game's container, replaces the database in one transaction, puts
`cases.env` back and starts the game. If the file's `cases.env` differs from the server's, it stops
and says so: add `--force-env` to take the backup's secrets, then run
`sudo ./deploy/install.sh --yes`. Delete the key from the server afterwards.

**On a new server** take the settings out of the backup first, so the installer keeps those secrets
(the database password among them):

```sh
age -d -i cases-backup-key.txt <file> | tar -x ./secret-cases.env
sudo install -D -m 600 secret-cases.env /etc/seasonal-cases/cases.env && rm secret-cases.env
```

then run the installer (step 4), then restore as above.

## Unattended

Copy `deploy/answers.example`, fill it in, and run

```sh
sudo ./deploy/install.sh --answers my-answers --yes
```

A missing answer then stops the run and names the flag or key to give.

## What the installer never does

It does not install Docker (it says how), never changes the website's own files (only its route file
in the website's routes folder, checked by the website's proxy before a reload and put back when the
check fails), never prints a secret, and never opens the website-only paths
(`/games/cases/api/website/`) to the internet.

Every setting is in [CONFIG.md](CONFIG.md).
