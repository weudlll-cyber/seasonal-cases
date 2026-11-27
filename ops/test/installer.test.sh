#!/usr/bin/env bash
# @file   ops/test/installer.test.sh
# @brief  The dry-run harness of the installer and the admin command: every question path, every
#         file they write and every verb of the game's, without packages, Docker or a network.
#
# Responsibility: each case runs ops/install.sh against a temporary root (SC_ROOT) with stub
#                 commands first on PATH (apt-get, dpkg, dpkg-query, apt-config, git, systemctl,
#                 curl, docker, nginx, groupadd, chown, sleep, ufw, sshd) that log their calls; the
#                 git stub's clone holds this checkout's ops/ folder, and the docker stub answers
#                 the website's containers and networks and hands out the kit's real ops/lib with a
#                 stand-in of its backup script (so the admin command, the route file, the
#                 operator's address and the host baseline are the kit's own). It checks: the files
#                 and their modes (0600 for settings and routes), that no secret appears in the
#                 output or on a command line, the image built for the mode, the compose stack, its
#                 overlays and its database roles, that a re-run changes nothing, --check with the
#                 health report, both website proxies with their route files, a refused proxy check
#                 restoring the previous route, the command `scases` (start, admin, backup, update
#                 with its backup first, a failing backup stopping it, confirm, rollback with and
#                 without a changed schema, uninstall keeping or purging the backups) and the
#                 refusals. Runs as root on Linux (CI's `deploy` job; locally in an Ubuntu
#                 container). The kit's ops/ comes from node_modules, or from KIT_OPS. Every case
#                 removes its temporary root.
# Depends on:     bash 4+, coreutils, tar, diff, ../install.sh, ../scases, ../lib, the kit's ops/
# Every assertion is a string `check` evaluates later, so its expansions are meant to wait (SC2016)
# and the variables it reads look unused to shellcheck (SC2034).
# shellcheck disable=SC2016,SC2034
set -uo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
INSTALL="$HERE/../install.sh"
KIT_OPS=${KIT_OPS:-$HERE/../../node_modules/@seasonal/kit/ops}
export REPO_OPS="$HERE/.."
FAILED=0
PASSED=0
[[ $EUID -eq 0 ]] || { printf 'run it as root (the admin command refuses anyone else)\n'; exit 1; }
[[ -r $KIT_OPS/lib/admin.sh ]] || { printf 'no kit ops folder at %s (pnpm install, or KIT_OPS)\n' "$KIT_OPS"; exit 1; }

fail() {
  printf 'FAIL [%s]: %s\n' "$CASE" "$*"
  FAILED=$((FAILED + 1))
}
pass() { PASSED=$((PASSED + 1)); }
check() { if eval "$1"; then pass; else fail "$2"; fi; }
mode_of() { stat -c %a "$1"; }
# The value of KEY='value' in a settings file.
value() { grep "^$2=" "$1" | cut -d"'" -f2; }
# The line number of the first call that matches.
line_of() { grep -n "$1" "$ROOT/calls.log" | head -n 1 | cut -d: -f1; }

# The kit's backup script as the admin command uses it: sourced for its functions, or run.
write_backup_stub() {
  cat >"$1" <<'KIT'
#!/usr/bin/env bash
SK_INVOKED=$(readlink -f "${BASH_SOURCE[0]}")
split_db_url() { :; }
pg_target() { printf '%s\n' -U stub; }
pg() { printf 'dump\n'; }
restore_database() { printf 'restore_database %s\n' "$1" >>"$SC_ROOT/calls.log"; }
do_backup() {
  [[ -n ${SK_BACKUP_AGE_RECIPIENT:-} ]] || { echo "backup: SK_BACKUP_AGE_RECIPIENT is not set" >&2; exit 1; }
  printf 'kit backup prefix=%s db=%s\n' "$SK_BACKUP_PREFIX" "$SK_BACKUP_DB_CONTAINER" >>"$SC_ROOT/calls.log"
  [[ ! -e $SC_ROOT/.backupfail ]] || exit 1
  BACKUP_FILE="$SK_BACKUP_DIR/cases-prod-stub.tar.age"
}
[[ -z ${SK_BACKUP_SOURCE_ONLY:-} ]] || return 0
case $1 in
  print-units)
    printf '# ---- /etc/systemd/system/%s-backup@.service\n[Unit]\nAfter=docker.service\nRequires=docker.service\n\n[Service]\nEnvironmentFile=%s\nExecStart=%s backup\n\n' "$SK_BACKUP_PREFIX" "$SK_BACKUP_ENV_FILE" "$SK_INVOKED"
    printf '# ---- /etc/systemd/system/%s-backup@.timer\n[Timer]\nOnCalendar=*-*-* 03:30:00\n' "$SK_BACKUP_PREFIX" ;;
  backup) do_backup ;;
  restore) printf 'kit %s\n' "$*" >>"$SC_ROOT/calls.log" ;;
esac
KIT
  chmod +x "$1"
}

# A fresh root with the stubs; ROOT and STUBS are set for the case.
setup() {
  CASE=$1
  ROOT=$(mktemp -d)
  STUBS="$ROOT/stubs"
  mkdir -p "$STUBS/kit/ops" "$ROOT/etc/apt/apt.conf.d" "$ROOT/etc/fail2ban/jail.d"
  printf 'ID=ubuntu\nVERSION_ID="24.04"\n' >"$ROOT/etc/os-release"
  cp -r "$KIT_OPS/lib" "$STUBS/kit/ops/lib"
  write_backup_stub "$STUBS/kit/ops/backup.sh"
  local cmd
  for cmd in apt-get dpkg dpkg-query apt-config git systemctl curl docker nginx groupadd chown sleep ufw sshd; do
    cat >"$STUBS/$cmd" <<'STUB'
#!/usr/bin/env bash
name=$(basename "$0")
printf '%s %s\n' "$name" "$*" >>"$SC_ROOT/calls.log"
case $name in
  dpkg) exit 1 ;;
  dpkg-query) printf 'install ok installed' ;;
  apt-config) printf 'APT::Periodic::Unattended-Upgrade "1";\n' ;;
  sshd) printf 'port 22\npermitrootlogin no\npasswordauthentication no\n' ;;
  ufw) case $1 in allow) printf 'Rule added\n' ;; status) printf 'Status: inactive\n' ;; esac ;;
  git)
    if [[ $1 == clone ]]; then
      dest=${*: -1}
      mkdir -p "$dest/.git" "$dest/ops"
      cp -r "$REPO_OPS/." "$dest/ops/"
      printf '{\n  "version": "1.1.0-rc.7"\n}\n' >"$dest/package.json"
    elif [[ $* == *"rev-parse --short HEAD"* ]]; then
      cat "$SC_ROOT/.commit" 2>/dev/null || printf 'abc1234\n'
    fi ;;
  curl) for ((i = 1; i <= $#; i++)); do [[ ${!i} == -o ]] && { j=$((i + 1)); : >"${!j}" 2>/dev/null; }; done
        printf '{"status":"ready","version":"1.1.0-rc.7"}' ;;
  nginx) [[ -n ${NGINX_FAIL:-} ]] && exit 1 ;;
  docker)
    [[ ! -e $SC_ROOT/.nodocker ]] || exit 1
    case "$1 $2" in
      'ps -q') [[ $* == *service=caddy* ]] && printf 'caddy123\n'; [[ $* == *service=site* ]] && printf 'site123\n' ;;
      'inspect -f') printf '%s\n' "${SITE_NETWORKS:-seasonal-site_default }" ;;
      'network inspect') printf '172.18.0.0/16 \n' ;;
      'run --rm') tar -C "$(dirname "$0")/kit" -cf - ops ;;
      'compose -p')
        # The roles' script arrives on standard input.
        if [[ $* == *ON_ERROR_STOP* ]]; then cat >/dev/null
        elif [[ $* == *schema_migrations* ]]; then cat "$SC_ROOT/.migrations" 2>/dev/null || printf '5\n'
        elif [[ $* == *" ps "* ]]; then printf 'seasonal-cases-app-1  Up (healthy)\n'
        fi ;;
    esac ;;
esac
exit 0
STUB
    chmod +x "$STUBS/$cmd"
  done
}

teardown() { rm -rf "$ROOT"; }

# Runs a script in the case's root; output in $OUT, exit code in $CODE.
script() {
  local path=$1
  shift
  OUT=$(SC_ROOT="$ROOT" PATH="$STUBS:$PATH" bash "$path" "$@" 2>&1 </dev/null)
  CODE=$?
}
installer() { script "$INSTALL" --repo https://example.org/cases.git "$@"; }
scases() { script "$ROOT/usr/local/bin/scases" "$@"; }

LOCAL=(--mode local --port 3970 --origin https://cases.example.org --ref master --yes)
KEY_PUB=age1$(printf 'q%.0s' {1..58})

case_local() {
  setup local
  installer "${LOCAL[@]}" --smtp-host mail.example.org --smtp-port 1025
  check '[[ $CODE == 0 ]]' "the install stopped: $OUT"
  local env="$ROOT/etc/seasonal-cases/prod.env" state="$ROOT/etc/seasonal-cases/install.conf"
  local calls="$ROOT/calls.log" stack="$ROOT/opt/seasonal-cases/stack"
  check '[[ $(mode_of "$env") == 600 && $(mode_of "$state") == 600 ]]' "settings not 0600"
  check '[[ $(value "$env" SC_IMAGE) == seasonal-cases:abc1234-local && $(value "$env" SC_HOST_PORT) == 3970 ]]' "image or port"
  check '[[ $(value "$env" SC_PUBLIC_ORIGIN) == https://cases.example.org && $(value "$env" SC_SMTP_PORT) == 1025 ]]' "local settings"
  check '[[ $(value "$env" SC_TRUSTED_PROXIES) == 172.30.251.1 ]]' "the proxy is not the network's gateway"
  local db owner app key cookie recovery
  local keys="$ROOT/etc/seasonal-cases/prod.keys"
  db=$(value "$env" POSTGRES_PASSWORD) key=$(value "$keys" SC_DATA_KEY)
  owner=$(value "$env" SC_DB_OWNER_PASSWORD) app=$(value "$env" SC_DB_APP_PASSWORD)
  cookie=$(value "$keys" SC_COOKIE_SECRET) recovery=$(value "$keys" SC_RECOVERY_KEY)
  check '[[ $(mode_of "$keys") == 600 && $(value "$env" SC_KEYS_FILE) == */etc/seasonal-cases/prod.keys ]]' "no keys file"
  check '! grep -q "SC_DATA_KEY\|SC_COOKIE_SECRET\|SC_RECOVERY_KEY" "$env"' "a key among the settings"
  check '[[ ${#db} == 48 && ${#key} == 64 && ${#cookie} == 64 && ${#recovery} == 64 && $recovery != "$key" ]]' "secrets not made"
  check '[[ ${#owner} == 48 && ${#app} == 48 && $owner != "$app" && $owner != "$db" ]]' "role passwords not made"
  check '[[ $OUT != *"$db"* && $OUT != *"$key"* && $OUT != *"$cookie"* && $OUT != *"$recovery"* && $OUT != *"$owner"* && $OUT != *"$app"* ]]' "a secret was printed"
  check '! grep -q "$owner\|$app\|$db" "$calls"' "a password on a command line"
  check '! grep -q "PASSWORD\|SC_DATA_KEY\|SC_COOKIE_SECRET\|SC_RECOVERY_KEY" "$state"' "a secret in the state file"
  check 'grep -q "^docker build .*SC_MODE=local .*SC_VERSION=1.1.0-rc.7 .*-t seasonal-cases:abc1234-local" "$calls"' "no image build"
  # The kit's ops/ whole out of the image, the stack's files and the command beside it.
  check 'grep -q "^docker run --rm --entrypoint tar seasonal-cases:abc1234-local -C /app/apps/server/node_modules/@seasonal/kit -cf - ops" "$calls"' "the kit's ops folder is not the image's"
  check '[[ -r "$ROOT/opt/seasonal-cases/kit/ops/lib/db-roles.sql" && -r "$stack/compose.yml" && -x "$stack/scases" && -r "$stack/lib/app.sh" ]]' "files not installed"
  check '[[ $(readlink "$ROOT/usr/local/bin/scases") == "$stack/scases" ]]' "no command link"
  check '[[ $(line_of "up -d --wait postgres") -lt $(line_of "ON_ERROR_STOP") && $(line_of "ON_ERROR_STOP") -lt $(line_of "up -d --remove-orphans") ]]' "the roles are not between the database and the stack"
  check 'grep -q "^docker compose -p seasonal-cases .*stack/compose.yml -f .*stack/compose.journal.yml up -d" "$calls"' "the stack was not started"
  check '! grep -q "compose.website.yml" "$calls"' "the website overlay in local mode"
  check 'grep -q "^curl .*http://127.0.0.1:3970/readyz" "$calls"' "it did not wait for readyz"
  # The logs: a journal of their own, kept 14 days, listening before Docker (DECISIONS D61).
  check 'grep -q "^MaxRetentionSec=14day" "$ROOT/etc/systemd/journald@seasonal-cases.conf"' "the logs are not kept 14 days"
  check 'grep -q "^Wants=systemd-journald@seasonal-cases.socket" "$ROOT/etc/systemd/system/docker.service.d/seasonal-cases-journal.conf"' "Docker does not wait for the journal"
  check 'grep -q "^systemctl start systemd-journald@seasonal-cases.socket" "$calls"' "the journal socket was not started"
  # The kit's host baseline, standalone: SSH first, then the firewall; the SSH jail.
  check '[[ $(line_of "^ufw allow 22/tcp") -lt $(line_of "^ufw --force enable") ]] && grep -q "^port = 22" "$ROOT/etc/fail2ban/jail.d/seasonal-sshd.conf"' "no host baseline: $OUT"
  # No address, no key: said, and neither a contact nor a backup.
  check '! grep -q "SC_PRIVACY_CONTACT" "$env" && [[ $OUT == *"no operator address"* ]]' "a privacy contact nobody gave: $OUT"
  check '[[ $OUT == *"NO BACKUP is set up"* && ! -e "$ROOT/etc/seasonal-cases/backup.conf" ]]' "a backup without a key: $OUT"
  # The operator's address is kept in the shared file and named on the privacy page.
  installer "${LOCAL[@]}" --smtp-host mail.example.org --smtp-port 1025 --email owner@example.org --backup-recipient "$KEY_PUB"
  check '[[ $(value "$env" SC_PRIVACY_CONTACT) == owner@example.org ]] && grep -q "^SK_OPERATOR_EMAIL=owner@example.org" "$ROOT/etc/seasonal/operator.env"' "no operator address: $OUT"
  local backup="$ROOT/etc/seasonal-cases/backup.conf" unit="$ROOT/etc/systemd/system/cases-backup@.service"
  check '[[ $CODE == 0 && $(mode_of "$backup") == 600 ]]' "no backup: $OUT"
  check '[[ $(value "$backup" SK_BACKUP_START_CMD) == "$ROOT/usr/local/bin/scases start" ]]' "a restore would not set the roles again"
  check '[[ $(value "$backup" SK_BACKUP_DB_CONTAINER) == seasonal-cases-postgres-1 && $(value "$backup" SK_BACKUP_AGE_RECIPIENT) == "$KEY_PUB" ]]' "backup settings"
  check '[[ $(value "$backup" SK_BACKUP_SECRET_FILES) == "$ROOT/etc/seasonal-cases/prod.keys" && $(value "$backup" SK_BACKUP_STOP_CMD) == "docker compose -p seasonal-cases stop app" ]]' "no keys file in the backup or no stop command"
  check 'grep -q "^Requires=docker.service" "$unit" && grep -q "^ExecStart=$ROOT/opt/seasonal-cases/kit/ops/backup.sh backup" "$unit"' "the units were changed"
  check 'grep -q "^systemctl enable --now cases-backup@prod.timer" "$calls"' "the timer is not enabled"
  check 'grep -q "^apt-get install .*age" "$calls" && grep -q "^groupadd .*cases-backup" "$calls"' "no age or no group"
  installer "${LOCAL[@]}" --backup-recipient AGE-SECRET-KEY-1abc
  check '[[ $CODE != 0 && $OUT == *"age public key"* ]]' "a private key was accepted: $OUT"
  # A re-run with the same (remembered) answers changes nothing and keeps the secrets.
  installer --yes
  check '[[ $CODE == 0 && $OUT == *"done (0 change(s))"* ]]' "a re-run changed something: $OUT"
  check '[[ $(value "$ROOT/etc/seasonal-cases/prod.keys" SC_DATA_KEY) == "$key" && $(value "$env" POSTGRES_PASSWORD) == "$db" && $(value "$env" SC_DB_APP_PASSWORD) == "$app" ]]' "a secret changed"
  # --check names a change, reports the health and changes nothing.
  : >"$calls"
  installer --check --port 3971
  check '[[ $OUT == *"would write /etc/seasonal-cases/prod.env"* && $OUT == *"seasonal-cases-app-1  Up (healthy)"* && $OUT == *"ready: "* && $OUT == *"none was"* ]]' "--check: $OUT"
  check '[[ $(value "$env" SC_HOST_PORT) == 3970 ]] && ! grep -q "^docker build\|up -d\|^ufw" "$calls"' "--check changed something"
  case_command
  teardown
}

# The installed command, on the case_local install.
case_command() {
  local env="$ROOT/etc/seasonal-cases/prod.env" state="$ROOT/etc/seasonal-cases/install.conf"
  local calls="$ROOT/calls.log" data="$ROOT/var/lib/seasonal-cases/prod"
  : >"$calls"
  scases admin promote Ada
  check '[[ $CODE == 0 ]] && grep -q "^docker compose -p seasonal-cases .* exec -T app node --import=tsx src/tools/sc.ts admin promote Ada" "$calls"' "admin: $OUT"
  scases backup
  check '[[ $CODE == 0 ]] && grep -q "^kit backup prefix=cases db=seasonal-cases-postgres-1" "$calls"' "backup: $OUT"
  # A restore hands the kit the folder the keys are restored to and compared in.
  : >"$calls"
  scases --yes restore "$ROOT/stubs/kit/ops/backup.sh" --identity "$ROOT/key.txt"
  check '[[ $CODE == 0 ]] && grep -q "^kit restore .*--yes --secrets-to $ROOT/etc/seasonal-cases$" "$calls"' "restore: $OUT"
  : >"$calls"
  scases start
  check '[[ $CODE == 0 ]] && grep -q "ON_ERROR_STOP" "$calls" && grep -q "up -d --remove-orphans" "$calls" && grep -q "exec -T app wget -qO- http://127.0.0.1:3970/readyz" "$calls"' "start: $OUT"
  scases status
  check '[[ $CODE == 0 && $OUT == *"health:      ready"* && $OUT == *"seasonal-cases:abc1234-local"* ]]' "status: $OUT"
  # A failing backup stops the update before anything is switched.
  printf 'def5678\n' >"$ROOT/.commit"
  touch "$ROOT/.backupfail"
  : >"$calls"
  scases update v1.0.0
  check '[[ $CODE != 0 && $(value "$env" SC_IMAGE) == seasonal-cases:abc1234-local && $(value "$state" SC_REF) == master ]] && ! grep -q "up -d" "$calls"' "a failed backup went on: $OUT"
  rm -f "$ROOT/.backupfail"
  : >"$calls"
  scases update v1.0.0
  check '[[ $CODE == 0 && $(value "$env" SC_IMAGE) == seasonal-cases:def5678-local && $(value "$state" SC_REF) == v1.0.0 ]]' "update: $OUT"
  check '[[ $(line_of "^docker build") -lt $(line_of "^kit backup") && $(line_of "^kit backup") -lt $(line_of "ON_ERROR_STOP") ]]' "update not in order"
  check '[[ -r $data/rollback.conf && -r $data/env.before ]]' "no rollback data"
  scases update v1.0.1
  check '[[ $CODE != 0 && $OUT == *"not confirmed"* ]]' "a second update went on: $OUT"
  # The schema did not change: a rollback keeps the data.
  : >"$calls"
  scases --yes rollback
  check '[[ $CODE == 0 && $(value "$env" SC_IMAGE) == seasonal-cases:abc1234-local && $(value "$state" SC_REF) == master ]] && ! grep -q "^restore_database" "$calls"' "rollback: $OUT"
  # The schema changed: the dump comes back, then the roles again.
  scases update v1.0.0
  printf '6\n' >"$ROOT/.migrations"
  : >"$calls"
  scases --yes rollback
  check '[[ $CODE == 0 ]] && [[ $(line_of "^restore_database") -lt $(line_of "ON_ERROR_STOP") ]]' "rollback with data: $OUT"
  rm -f "$ROOT/.migrations"
  scases update v1.0.0
  scases confirm
  check '[[ $CODE == 0 && ! -e $data/rollback.conf && ! -e $data/pre-update.dump ]]' "confirm: $OUT"
  scases dance
  check '[[ $CODE == 2 && $OUT == *"admin promote <name>"* ]]' "an unknown verb: $OUT"
  # Uninstall keeps the backups and the operator's address.
  mkdir -p "$ROOT/var/backups/seasonal-cases/prod"
  touch "$ROOT/var/backups/seasonal-cases/prod/kept.tar.age"
  : >"$calls"
  scases uninstall
  check '[[ $CODE != 0 && -r $env ]]' "uninstalled without the name: $OUT"
  scases --yes uninstall
  check '[[ $CODE == 0 ]] && grep -q "down --volumes" "$calls" && grep -q "^systemctl disable --now cases-backup@prod.timer" "$calls"' "uninstall: $OUT"
  check '[[ ! -e "$ROOT/etc/seasonal-cases" && ! -e "$ROOT/opt/seasonal-cases" && ! -L "$ROOT/usr/local/bin/scases" && ! -e "$ROOT/etc/systemd/journald@seasonal-cases.conf" && ! -e "$ROOT/etc/systemd/system/cases-backup@.timer" ]]' "something was left: $OUT"
  check '[[ -r "$ROOT/var/backups/seasonal-cases/prod/kept.tar.age" && -r "$ROOT/etc/seasonal/operator.env" ]]' "the backups or the operator's file are gone"
}

website_root() {
  mkdir -p "$ROOT/etc/seasonal/routes"
  printf '3800\n' >"$ROOT/etc/seasonal/site-local-port"
  printf '%s\n' "$(printf 'ab%.0s' {1..32})" >"$ROOT/etc/seasonal/games-sync-token"
}

WEBSITE=(--mode website --port 3970 --website-origin https://example.org --ref master --yes)

case_nginx() {
  setup website-nginx
  website_root
  installer "${WEBSITE[@]}" --proxy nginx
  check '[[ $CODE == 0 ]]' "the install stopped: $OUT"
  local route="$ROOT/etc/seasonal/routes/cases.conf" env="$ROOT/etc/seasonal-cases/prod.env" secret
  check '[[ $(mode_of "$route") == 600 ]]' "the route file is not 0600"
  secret=$(value "$env" SC_PROXY_SECRET)
  check 'grep -q "proxy_set_header X-Sc-Proxy-Secret \"$secret\";" "$route"' "the secret is not in the sign-in route"
  check 'grep -q "proxy_set_header X-Acting-User-Id \"\";" "$route"' "forged identity headers are not cleared"
  check '[[ $(grep -c "proxy_set_header Cookie \$sk_cases_cookie;" "$route") == 2 ]]' "the website cookie is not stripped on both routes"
  check 'grep -q "proxy_pass http://127.0.0.1:3800/api/games/cases/authorize;" "$route" && grep -q "proxy_pass http://127.0.0.1:3970;" "$route"' "route upstreams"
  check '[[ $(value "$env" SC_WEBSITE_NETWORK) == seasonal-site_default && $(value "$env" SC_WEBSITE_LOCAL_ORIGIN) == http://site:3800 ]]' "network or feed"
  check '[[ $(value "$env" SC_TRUSTED_PROXIES) == 172.30.251.1 ]]' "the host nginx is not the gateway"
  check 'grep -q "compose.website.yml .*up -d" "$ROOT/calls.log" && grep -q "SC_MODE=website" "$ROOT/calls.log"' "not the website stack"
  check 'grep -q "^curl .*http://127.0.0.1:3970/games/cases/readyz" "$ROOT/calls.log" && grep -q "^curl .*https://example.org/games/cases/readyz" "$ROOT/calls.log"' "not checked under the base path and through the website"
  check '[[ $OUT != *"$secret"* ]]' "the proxy secret was printed"
  check 'grep -q "^nginx -t -q" "$ROOT/calls.log" && grep -q "^systemctl reload nginx" "$ROOT/calls.log"' "no check and reload"
  # Inside the website the website's installer owns the host.
  check '[[ $OUT == *"owns this server"* ]] && ! grep -q "^ufw" "$ROOT/calls.log"' "the host was changed: $OUT"
  : >"$ROOT/calls.log"
  installer --yes
  check '[[ $CODE == 0 ]] && ! grep -q "^systemctl reload nginx" "$ROOT/calls.log"' "an unchanged route reloaded nginx"
  # A refused check restores the earlier route and reloads nothing.
  local before
  before=$(cat "$route")
  : >"$ROOT/calls.log"
  NGINX_FAIL=1 installer "${WEBSITE[@]}" --proxy nginx --port 3975
  check '[[ $CODE != 0 && $OUT == *"the earlier state is back"* ]]' "a refused check went on: $OUT"
  check '[[ $(cat "$route") == "$before" ]]' "the earlier route was not restored"
  check '! grep -q "^systemctl reload nginx" "$ROOT/calls.log"' "nginx was reloaded after a refused check"
  : >"$ROOT/calls.log"
  scases --yes uninstall --purge-backups
  check '[[ $CODE == 0 && ! -e $route && ! -e "$ROOT/var/backups/seasonal-cases/prod" ]] && grep -q "^systemctl reload nginx" "$ROOT/calls.log"' "uninstall left the route or backups: $OUT"
  teardown
}

case_caddy() {
  setup website-caddy
  mkdir -p "$ROOT/site/deploy/site/routes"
  local routes="$ROOT/site/deploy/site/routes"
  installer "${WEBSITE[@]}" --proxy caddy --routes-dir "$routes"
  check '[[ $CODE == 0 ]]' "the install stopped: $OUT"
  local route="$routes/cases.caddy" env="$ROOT/etc/seasonal-cases/prod.env" state="$ROOT/etc/seasonal-cases/install.conf"
  check '[[ $(mode_of "$route") == 600 ]]' "the route file is not 0600"
  check 'grep -q "forward_auth @sk_cases_signin site:3800" "$route"' "Caddy route wrong"
  check 'grep -q "reverse_proxy sc-cases:3970" "$route"' "the game is not reached on the network"
  check 'grep -q "^docker exec caddy123 caddy validate" "$ROOT/calls.log"' "no Caddy check"
  check '[[ $OUT == *"no account-changes feed"* ]]' "the missing feed was not said"
  # The trusted range: the website network's ranges, remembered (D37) …
  check '[[ $(value "$state" SC_TRUSTED_PROXIES) == 172.18.0.0/16 ]]' "the range was not remembered"
  # … or the operator's narrower answer, in the state and the settings; the token once the website
  # wrote it.
  website_root
  installer "${WEBSITE[@]}" --proxy caddy --routes-dir "$routes" --proxies 172.18.0.9
  check '[[ $(value "$state" SC_TRUSTED_PROXIES) == 172.18.0.9 && $(value "$env" SC_TRUSTED_PROXIES) == 172.18.0.9 ]]' "the answer was not kept"
  check '[[ $(value "$env" SC_WEBSITE_LOCAL_ORIGIN) == http://site:3800 && -n $(value "$env" SC_GAMES_SYNC_TOKEN) ]]' "no feed with a token"
  teardown
  # A website container on several networks, none the default: the operator is asked.
  setup website-networks
  mkdir -p "$ROOT/site/deploy/site/routes"
  SITE_NETWORKS='a_net b_net ' installer "${WEBSITE[@]}" --proxy caddy --routes-dir "$ROOT/site/deploy/site/routes"
  check '[[ $CODE != 0 && $OUT == *"missing answer for: SC_WEBSITE_NETWORK"* ]]' "a network was guessed: $OUT"
  teardown
}

case_refusals() {
  setup refusals
  touch "$ROOT/.nodocker"
  installer "${LOCAL[@]}"
  check '[[ $CODE != 0 && $OUT == *"docker.io docker-compose-v2"* ]]' "a missing Docker went on: $OUT"
  rm "$ROOT/.nodocker"
  installer --mode local --port 3970 --ref master --yes
  check '[[ $CODE != 0 && $OUT == *"missing answer for: SC_PUBLIC_ORIGIN"* ]]' "a missing answer went on: $OUT"
  installer "${LOCAL[@]}" --mode cloud
  check '[[ $CODE != 0 && $OUT == *"SC_INSTALL_MODE must be local or website"* ]]' "a wrong mode went on: $OUT"
  installer --update
  check '[[ $CODE != 0 && $OUT == *"unknown option --update"* ]]' "the removed update path was taken: $OUT"
  installer "${LOCAL[@]}" --email 'a b@example.org'
  check '[[ $CODE != 0 && $OUT == *"not a plain e-mail address"* ]]' "a wrong address went on: $OUT"
  installer "${LOCAL[@]}" --repo -u
  check '[[ $CODE != 0 && $OUT == *"SC_REPO must be"* ]]' "a repository option went on: $OUT"
  local answers="$ROOT/answers"
  printf 'SC_INSTALL_MODE=local\nSC_PORT=3980\nSC_EDGE_SUBNET=172.30.99.0/24\nSC_PUBLIC_ORIGIN=https://c.example.org\nSC_REF=master\n' >"$answers"
  installer --answers "$answers" --yes
  check '[[ $CODE == 0 && $(value "$ROOT/etc/seasonal-cases/prod.env" SC_TRUSTED_PROXIES) == 172.30.99.1 ]]' "the answers file was not used: $OUT"
  teardown
}

case_local
case_nginx
case_caddy
case_refusals
printf '%s passed, %s failed\n' "$PASSED" "$FAILED"
((FAILED == 0))
