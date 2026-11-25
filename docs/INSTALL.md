# Installing Seasonal Cases on a server

One call installs the game on a Debian or Ubuntu server, the same for everyone: from a terminal
on the server (an SSH app such as Termius on a phone or tablet works as well as a desktop
terminal). Nothing here is tied to a particular server.

## What you need

- A Debian 12 or Ubuntu 22.04/24.04 server you can reach over SSH, with `sudo`.
- **Standalone** (`local` mode, own accounts): a domain name pointing at the server and a reverse
  proxy that terminates HTTPS and forwards to the game (Caddy, nginx, …). The game listens on
  `127.0.0.1:3970` by default.
- **Under the Seasonal Entertainment website** (`website` mode, `/games/cases/`): the website
  installed on the same server and prepared for games (its `deploy/install.sh --update --cases`;
  its docs/DEPLOYMENT.md, "Embedded games"). The game writes only its own route file into the
  website's routes folder.

## Step by step

1. **Sign in to the server** (in Termius: open the host, then the terminal).

2. **Make your backup key on your own computer** (once; before the installer): install
   [age](https://age-encryption.org), then

   ```sh
   age-keygen -o cases-backup-key.txt
   age-keygen -y cases-backup-key.txt   # prints the public key: age1...
   ```

   Keep `cases-backup-key.txt` somewhere safe and **never on the server**: without it a backup
   cannot be opened. The installer asks for the public key (`age1...`) only.

3. **Get the code** (once):

   ```sh
   sudo apt-get update && sudo apt-get install -y git
   git clone https://github.com/weudlll-cyber/seasonal-cases.git
   cd seasonal-cases
   ```

4. **Run the installer** and answer its questions; Enter takes the value in brackets:

   ```sh
   sudo ./deploy/install.sh
   ```

   It asks for the mode (`local` or `website`), the port, the database (`create` makes a local
   PostgreSQL with its own role and database), and then:
   - local mode: the address players open (`https://cases.example.org`), your proxy's addresses,
     and an SMTP relay for the forgotten-password mail (or none);
   - website mode: the website's address; the website's proxy (`nginx` or `caddy`) and its
     routes folder are found where the website put them;
   - your backup public key (`--backup-recipient age1...`). Without it the game runs with **no
     backup**, and the installer says so.

   It installs Node 22 (from NodeSource's signed repository) and pnpm, PostgreSQL when asked,
   creates the user `seasonal-cases`, builds the game, writes the settings
   (`/etc/seasonal-cases/cases.env`, readable by root only), starts the service
   `seasonal-cases` and waits until it answers. The secrets (data key, cookie secret, proxy
   secret, database password) are made once and never printed.

5. **Standalone only: point your proxy at the game.** For Caddy:

   ```text
   cases.example.org {
       reverse_proxy 127.0.0.1:3970
   }
   ```

6. **Make the first admin** (standalone): register on the page, then

   ```sh
   sudo ./deploy/admin.sh admin promote <your name>
   ```

   Sign in again, open Admin, set up two-factor sign-in with an authenticator app, and keep the
   ten recovery codes. A lost phone and lost codes: `sudo ./deploy/admin.sh admin reset-2fa
<name>`, then set it up again.

7. **Website mode:** add the game's card in the website's Admin → Games (path `/games/cases`).

8. **Make the first backup, check it and pull it** (before any real player):

   ```sh
   sudo ./deploy/backup.sh backup
   sudo systemctl list-timers cases-backup@prod.timer   # every night at 03:30
   ```

   Then pull it to your own computer and run the drill below once.

## Later

| What                               | Command                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| See what an update would change    | `sudo ./deploy/install.sh --check --ref v1.0.0`                                              |
| Update to a tag or branch          | `sudo ./deploy/install.sh --update --ref v1.0.0`                                             |
| Re-run with the remembered answers | `sudo ./deploy/install.sh --yes`                                                             |
| Status and logs                    | `systemctl status seasonal-cases`, `journalctl --namespace=seasonal-cases -u seasonal-cases` |
| Health                             | `curl http://127.0.0.1:3970/healthz` (and `/readyz`)                                         |

`--update` fetches the tag or branch, builds, restarts; the server applies new database
migrations itself on start. The answers live in `/etc/seasonal-cases/install.conf`; change one
with its flag (`--port 3971`) or by answering again.

**Logs and privacy.** The game's logs go to their own journal namespace, `seasonal-cases`, which
keeps them for 14 days (`/etc/systemd/journald@seasonal-cases.conf`, `MaxRetentionSec=14day`);
other services' logs are not touched. The privacy page names the contact from the answer
`SC_PRIVACY_CONTACT` (a name or an address; empty: "the operator of this site").

## Backups

Set up by the installer when it has your public key (DECISIONS D68; the kit's
`docs/OPERATIONS.md` describes the script). Every night at 03:30 the server writes one encrypted
file into `/var/backups/seasonal-cases/prod` (`cases-prod-<UTC time>.tar.age`): the database
dump, the settings file with every secret (`cases.env`: without the data and recovery keys a
restored database cannot open what it sealed) and a manifest. The game keeps no uploads. The 14
newest files are kept, and of older ones the newest of each of 8 weeks. Settings:
`/etc/seasonal-cases/backup.env` (root only). A failed backup is logged
(`journalctl -u cases-backup@prod`).

**Pull to your own computer.** Add your SSH user to the group once
(`sudo usermod -aG cases-backup <user>`), then from a clone of this repository after
`pnpm install`, on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File node_modules\@seasonal\kit\ops\pull-backups.ps1 -Server <user@server> -RemoteDir /var/backups/seasonal-cases/prod -Prefix cases
```

and on Linux or macOS
`node_modules/@seasonal/kit/ops/pull-backups.sh <user@server> /var/backups/seasonal-cases/prod cases [folder]`.

**Drill (does the file restore?)** needs Docker, so run it on a computer that has it, with your
private key; it restores into a throw-away PostgreSQL container and compares every table:

```sh
SK_BACKUP_PREFIX=cases SK_BACKUP_ENV=prod SK_BACKUP_PG_IMAGE=postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24   bash node_modules/@seasonal/kit/ops/backup.sh drill <file> --identity cases-backup-key.txt
```

(Git Bash on Windows: the script's `backup` command does not run there, its `drill` does.)

**Restore** (everything since that backup is lost). Copy the file and your key to the server for
the moment, then:

```sh
sudo ./deploy/backup.sh restore <file> --identity cases-backup-key.txt --secrets-to /etc/seasonal-cases
```

It asks first, stops the game, replaces the database in one transaction, puts `cases.env` back
and starts the game. If the file's `cases.env` differs from the server's, it stops and says so:
add `--force-env` to take the backup's secrets. Delete the key from the server afterwards.

**On a new server** take the settings out of the backup first, so the installer keeps those
secrets (the database password among them):

```sh
age -d -i cases-backup-key.txt <file> | tar -x ./secret-cases.env
sudo install -D -m 600 secret-cases.env /etc/seasonal-cases/cases.env && rm secret-cases.env
```

then run the installer, then restore as above.

## Unattended

Copy `deploy/answers.example`, fill it in, and run

```sh
sudo ./deploy/install.sh --answers my-answers --yes
```

A missing answer then stops the run and names the flag or key to give.

## What the installer never does

It never changes the website's own files (only its route file in the website's routes folder,
checked by the website's proxy before a reload and put back when the check fails), never prints
a secret, and never opens the website-only paths (`/games/cases/api/website/`) to the internet.

Every setting the game reads is in [CONFIG.md](CONFIG.md).
