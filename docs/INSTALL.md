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

2. **Get the code** (once):

   ```sh
   sudo apt-get update && sudo apt-get install -y git
   git clone https://github.com/weudlll-cyber/seasonal-cases.git
   cd seasonal-cases
   ```

3. **Run the installer** and answer its questions; Enter takes the value in brackets:

   ```sh
   sudo ./deploy/install.sh
   ```

   It asks for the mode (`local` or `website`), the port, the database (`create` makes a local
   PostgreSQL with its own role and database), and then:
   - local mode: the address players open (`https://cases.example.org`), your proxy's addresses,
     and an SMTP relay for the forgotten-password mail (or none);
   - website mode: the website's address; the website's proxy (`nginx` or `caddy`) and its
     routes folder are found where the website put them.

   It installs Node 22 (from NodeSource's signed repository) and pnpm, PostgreSQL when asked,
   creates the user `seasonal-cases`, builds the game, writes the settings
   (`/etc/seasonal-cases/cases.env`, readable by root only), starts the service
   `seasonal-cases` and waits until it answers. The secrets (data key, cookie secret, proxy
   secret, database password) are made once and never printed.

4. **Standalone only: point your proxy at the game.** For Caddy:

   ```text
   cases.example.org {
       reverse_proxy 127.0.0.1:3970
   }
   ```

5. **Make the first admin** (standalone): register on the page, then

   ```sh
   sudo ./deploy/admin.sh admin promote <your name>
   ```

   Sign in again, open Admin, set up two-factor sign-in with an authenticator app, and keep the
   ten recovery codes. A lost phone and lost codes: `sudo ./deploy/admin.sh admin reset-2fa
<name>`, then set it up again.

6. **Website mode:** add the game's card in the website's Admin → Games (path `/games/cases`).

## Later

| What                               | Command                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| See what an update would change    | `sudo ./deploy/install.sh --check --ref v1.0.0`                   |
| Update to a tag or branch          | `sudo ./deploy/install.sh --update --ref v1.0.0`                  |
| Re-run with the remembered answers | `sudo ./deploy/install.sh --yes`                                  |
| Status and logs                    | `systemctl status seasonal-cases`, `journalctl -u seasonal-cases` |
| Health                             | `curl http://127.0.0.1:3970/api/health`                           |

`--update` fetches the tag or branch, builds, restarts; the server applies new database
migrations itself on start. The answers live in `/etc/seasonal-cases/install.conf`; change one
with its flag (`--port 3971`) or by answering again.

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
