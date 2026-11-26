#!/usr/bin/env bash
# @file   deploy/test/installer.test.sh
# @brief  The installer's dry-run harness: every question path and every file it writes, without
#         root, packages, Docker or a network.
#
# Responsibility: each case runs deploy/install.sh against a temporary root (SC_ROOT) with stub
#                 commands first on PATH (apt-get, dpkg, git, systemctl, curl, docker, nginx,
#                 groupadd, chown, sleep) that log their calls; the git stub's clone holds a
#                 package.json, and the docker stub answers the website's containers and networks
#                 and hands out a stand-in of the kit's backup script (print-units in the real
#                 one's shape; backup logs its settings). It checks: the files and their modes
#                 (0600 for settings and routes), that no secret appears in the output, the image
#                 built for the mode, the compose stack and its overlays, that a re-run changes
#                 nothing, --check with the health report, --update with the backup first (and a
#                 failing backup stopping it), both website proxies with their route files, a
#                 refused proxy check restoring the previous route, admin.sh and backup.sh, and the
#                 refusals (no Docker, a missing answer, a wrong one, an update without an
#                 install). Runs on Linux (CI's `deploy` job; locally in an Ubuntu container).
#                 Every case removes its temporary root.
# Depends on:     bash 4+, coreutils, ../install.sh, ../admin.sh, ../backup.sh
# Every assertion is a string `check` evaluates later, so its expansions are meant to wait (SC2016)
# and the variables it reads look unused to shellcheck (SC2034).
# shellcheck disable=SC2016,SC2034
set -uo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
INSTALL="$HERE/../install.sh"
FAILED=0
PASSED=0

fail() {
  printf 'FAIL [%s]: %s\n' "$CASE" "$*"
  FAILED=$((FAILED + 1))
}
pass() { PASSED=$((PASSED + 1)); }
check() { if eval "$1"; then pass; else fail "$2"; fi; }
mode_of() { stat -c %a "$1"; }
# The value of KEY='value' in a settings file.
value() { grep "^$2=" "$1" | cut -d"'" -f2; }

# A fresh root with the stubs; ROOT and STUBS are set for the case.
setup() {
  CASE=$1
  ROOT=$(mktemp -d)
  STUBS="$ROOT/stubs"
  mkdir -p "$STUBS" "$ROOT/etc"
  printf 'ID=ubuntu\nVERSION_ID="24.04"\n' >"$ROOT/etc/os-release"
  cat >"$STUBS/kit-backup.sh" <<'KIT'
#!/usr/bin/env bash
case $1 in
  print-units)
    self=$(readlink -f "${BASH_SOURCE[0]}")
    printf '# ---- /etc/systemd/system/%s-backup@.service\n[Unit]\nAfter=docker.service\nRequires=docker.service\n\n[Service]\nEnvironmentFile=%s\nExecStart=%s backup\n\n' "$SK_BACKUP_PREFIX" "$SK_BACKUP_ENV_FILE" "$self"
    printf '# ---- /etc/systemd/system/%s-backup@.timer\n[Timer]\nOnCalendar=*-*-* 03:30:00\n' "$SK_BACKUP_PREFIX" ;;
  backup)
    printf 'kit backup prefix=%s db=%s\n' "$SK_BACKUP_PREFIX" "$SK_BACKUP_DB_CONTAINER" >>"$SC_ROOT/calls.log"
    [[ ! -e $SC_ROOT/.backupfail ]] || exit 1 ;;
esac
exit 0
KIT
  local cmd
  for cmd in apt-get dpkg git systemctl curl docker nginx groupadd chown sleep; do
    cat >"$STUBS/$cmd" <<'STUB'
#!/usr/bin/env bash
name=$(basename "$0")
printf '%s %s\n' "$name" "$*" >>"$SC_ROOT/calls.log"
case $name in
  dpkg) exit 1 ;;
  git)
    if [[ $1 == clone ]]; then
      mkdir -p "${*: -1}/.git" "${*: -1}/ops"
      printf '{\n  "version": "1.1.0-rc.4"\n}\n' >"${*: -1}/package.json"
    elif [[ $* == *"rev-parse --short HEAD"* ]]; then printf 'abc1234\n'; fi ;;
  curl) for ((i = 1; i <= $#; i++)); do [[ ${!i} == -o ]] && { j=$((i + 1)); : >"${!j}" 2>/dev/null; }; done
        printf '{"status":"ready","version":"1.1.0-rc.4"}' ;;
  nginx) [[ -n ${NGINX_FAIL:-} ]] && exit 1 ;;
  docker)
    [[ ! -e $SC_ROOT/.nodocker ]] || exit 1
    case "$1 $2" in
      'ps -q') [[ $* == *service=caddy* ]] && printf 'caddy123\n'; [[ $* == *service=site* ]] && printf 'site123\n' ;;
      'inspect -f') printf '%s\n' "${SITE_NETWORKS:-seasonal-site_default }" ;;
      'network inspect') printf '172.18.0.0/16 \n' ;;
      'run --rm') cat "$(dirname "$0")/kit-backup.sh" ;;
      'compose -p') [[ $* == *" ps --all"* ]] && printf 'seasonal-cases-app-1  Up (healthy)\n' ;;
    esac ;;
esac
exit 0
STUB
    chmod +x "$STUBS/$cmd"
  done
}

teardown() { rm -rf "$ROOT"; }

# Runs a script of deploy/ in the case's root; output in $OUT, exit code in $CODE.
script() {
  local name=$1
  shift
  OUT=$(SC_ROOT="$ROOT" PATH="$STUBS:$PATH" bash "$HERE/../$name" "$@" 2>&1 </dev/null)
  CODE=$?
}
installer() { script install.sh --repo https://example.org/cases.git "$@"; }

LOCAL=(--mode local --port 3970 --origin https://cases.example.org --ref master --yes)

case_local() {
  setup local
  installer "${LOCAL[@]}" --smtp-host mail.example.org --smtp-port 1025
  check '[[ $CODE == 0 ]]' "the install stopped: $OUT"
  local env="$ROOT/etc/seasonal-cases/cases.env" state="$ROOT/etc/seasonal-cases/install.conf"
  local calls="$ROOT/calls.log"
  check '[[ $(mode_of "$env") == 600 && $(mode_of "$state") == 600 ]]' "settings not 0600"
  check '[[ $(value "$env" SC_IMAGE) == seasonal-cases:abc1234-local && $(value "$env" SC_HOST_PORT) == 3970 ]]' "image or port"
  check '[[ $(value "$env" SC_PUBLIC_ORIGIN) == https://cases.example.org && $(value "$env" SC_SMTP_PORT) == 1025 ]]' "local settings"
  check '[[ $(value "$env" SC_TRUSTED_PROXIES) == 172.30.251.1 ]]' "the proxy is not the network's gateway"
  local db key cookie recovery
  db=$(value "$env" POSTGRES_PASSWORD) key=$(value "$env" SC_DATA_KEY)
  cookie=$(value "$env" SC_COOKIE_SECRET) recovery=$(value "$env" SC_RECOVERY_KEY)
  check '[[ ${#db} == 48 && ${#key} == 64 && ${#cookie} == 64 && ${#recovery} == 64 && $recovery != "$key" ]]' "secrets not made"
  check '[[ $OUT != *"$db"* && $OUT != *"$key"* && $OUT != *"$cookie"* && $OUT != *"$recovery"* ]]' "a secret was printed"
  check '! grep -q "POSTGRES_PASSWORD\|SC_DATA_KEY\|SC_COOKIE_SECRET\|SC_RECOVERY_KEY" "$state"' "a secret in the state file"
  check 'grep -q "^docker build .*SC_MODE=local .*SC_VERSION=1.1.0-rc.4 .*-t seasonal-cases:abc1234-local" "$calls"' "no image build"
  check 'grep -q "^docker compose -p seasonal-cases .*ops/compose.yml -f .*ops/compose.journal.yml up -d" "$calls"' "the stack was not started"
  check '! grep -q "compose.website.yml" "$calls"' "the website overlay in local mode"
  check 'grep -q "^curl .*http://127.0.0.1:3970/readyz" "$calls"' "it did not wait for readyz"
  # The logs: a journal of their own, kept 14 days, listening before Docker (DECISIONS D61).
  check 'grep -q "^MaxRetentionSec=14day" "$ROOT/etc/systemd/journald@seasonal-cases.conf"' "the logs are not kept 14 days"
  check 'grep -q "^Wants=systemd-journald@seasonal-cases.socket" "$ROOT/etc/systemd/system/docker.service.d/seasonal-cases-journal.conf"' "Docker does not wait for the journal"
  check 'grep -q "^systemctl start systemd-journald@seasonal-cases.socket" "$calls"' "the journal socket was not started"
  check '! grep -q "SC_PRIVACY_CONTACT" "$env"' "a privacy contact nobody gave"
  # No key given: no backup, said loudly.
  check '[[ $OUT == *"NO BACKUP is set up"* && ! -e "$ROOT/etc/seasonal-cases/backup.env" ]]' "a backup without a key: $OUT"
  # With the operator's public key: the kit's script out of the image, the settings (root only),
  # the kit's units as it prints them, the timer enabled (DECISIONS D68, D78).
  local key_pub
  key_pub=age1$(printf 'q%.0s' {1..58})
  installer "${LOCAL[@]}" --smtp-host mail.example.org --smtp-port 1025 --backup-recipient "$key_pub"
  local backup="$ROOT/etc/seasonal-cases/backup.env" unit="$ROOT/etc/systemd/system/cases-backup@.service"
  check '[[ $CODE == 0 && $(mode_of "$backup") == 600 && $(mode_of "$ROOT/opt/seasonal-cases/backup.sh") == 755 ]]' "no backup: $OUT"
  check 'grep -q "^docker run --rm --entrypoint cat seasonal-cases:abc1234-local /app/apps/server/node_modules/@seasonal/kit/ops/backup.sh" "$calls"' "the script is not the image's"
  check '[[ $(value "$backup" SK_BACKUP_DB_CONTAINER) == seasonal-cases-postgres-1 && $(value "$backup" SK_BACKUP_AGE_RECIPIENT) == "$key_pub" ]]' "backup settings"
  check '[[ $(value "$backup" SK_BACKUP_SECRET_FILES) == /etc/seasonal-cases/cases.env && $(value "$backup" SK_BACKUP_STOP_CMD) == "docker compose -p seasonal-cases stop app" ]]' "no secret file or stop command"
  check 'grep -q "^Requires=docker.service" "$unit" && grep -q "^ExecStart=$ROOT/opt/seasonal-cases/backup.sh backup" "$unit"' "the units were changed"
  check 'grep -q "^systemctl enable --now cases-backup@prod.timer" "$calls"' "the timer is not enabled"
  check 'grep -q "^apt-get install .*age" "$calls" && grep -q "^groupadd .*cases-backup" "$calls"' "no age or no group"
  installer "${LOCAL[@]}" --backup-recipient AGE-SECRET-KEY-1abc
  check '[[ $CODE != 0 && $OUT == *"age public key"* ]]' "a private key was accepted: $OUT"
  # A re-run with the same answers changes nothing and keeps the secrets.
  installer "${LOCAL[@]}" --smtp-host mail.example.org --smtp-port 1025 --backup-recipient "$key_pub"
  check '[[ $OUT == *"done (0 change(s))"* ]]' "a re-run changed something: $OUT"
  check '[[ $(value "$env" SC_DATA_KEY) == "$key" && $(value "$env" POSTGRES_PASSWORD) == "$db" ]]' "a secret changed"
  # --check names a change, reports the health and changes nothing.
  : >"$calls"
  installer --check --port 3971
  check '[[ $OUT == *"would write /etc/seasonal-cases/cases.env"* && $OUT == *"seasonal-cases-app-1  Up (healthy)"* && $OUT == *"ready: "* && $OUT == *"none was"* ]]' "--check: $OUT"
  check '[[ $(value "$env" SC_HOST_PORT) == 3970 ]] && ! grep -q "^docker build\|up -d" "$calls"' "--check changed something"
  # --update backs up first, then takes the new ref.
  : >"$calls"
  installer --update --ref v1.0.0
  check '[[ $CODE == 0 ]] && grep -Eq "checkout --quiet --force (origin/)?v1.0.0" "$calls"' "--update: $OUT"
  check '[[ $(grep -n "^kit backup prefix=cases db=seasonal-cases-postgres-1" "$calls" | cut -d: -f1) -lt $(grep -n "checkout" "$calls" | head -n 1 | cut -d: -f1) ]]' "no backup before the update"
  check '[[ $(value "$state" SC_REF) == v1.0.0 ]]' "the new ref was not remembered"
  touch "$ROOT/.backupfail"
  : >"$calls"
  installer --update --ref v1.0.1
  check '[[ $CODE != 0 && $OUT == *"nothing was changed"* ]] && ! grep -q "checkout\|^docker build" "$calls"' "a failed backup went on: $OUT"
  rm -f "$ROOT/.backupfail"
  # The command line runs in the game's container, the backup commands in the kit's script.
  script admin.sh admin promote Ada
  check 'grep -q "^docker compose -p seasonal-cases exec -T app node --import=tsx src/tools/sc.ts admin promote Ada" "$calls"' "admin.sh: $OUT"
  : >"$calls"
  script backup.sh backup
  check '[[ $CODE == 0 ]] && grep -q "^kit backup prefix=cases" "$calls"' "backup.sh: $OUT"
  teardown
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
  local route="$ROOT/etc/seasonal/routes/cases.conf" env="$ROOT/etc/seasonal-cases/cases.env" secret
  check '[[ $(mode_of "$route") == 600 ]]' "the route file is not 0600"
  secret=$(value "$env" SC_PROXY_SECRET)
  check 'grep -q "proxy_set_header X-Sc-Proxy-Secret \"$secret\";" "$route"' "the secret is not in the sign-in route"
  check 'grep -q "location ^~ /games/cases/api/website/ { return 404; }" "$route"' "the card is not denied"
  check 'grep -q "proxy_set_header X-Acting-User-Id \"\";" "$route"' "forged identity headers are not cleared"
  check '[[ $(grep -c "proxy_set_header Cookie \$sc_cookie;" "$route") == 2 ]]' "the website cookie is not stripped on both routes"
  check 'grep -q "proxy_pass http://127.0.0.1:3800/api/games/cases/authorize;" "$route" && grep -q "proxy_pass http://127.0.0.1:3970;" "$route"' "route upstreams"
  check '[[ $(value "$env" SC_WEBSITE_NETWORK) == seasonal-site_default && $(value "$env" SC_WEBSITE_LOCAL_ORIGIN) == http://site:3800 ]]' "network or feed"
  check '[[ $(value "$env" SC_TRUSTED_PROXIES) == 172.30.251.1 ]]' "the host nginx is not the gateway"
  check 'grep -q "compose.website.yml .*up -d" "$ROOT/calls.log" && grep -q "SC_MODE=website" "$ROOT/calls.log"' "not the website stack"
  check 'grep -q "^curl .*http://127.0.0.1:3970/games/cases/readyz" "$ROOT/calls.log"' "it did not wait under the base path"
  check '[[ $OUT != *"$secret"* ]]' "the proxy secret was printed"
  check 'grep -q "^nginx -t -q" "$ROOT/calls.log" && grep -q "^systemctl reload nginx" "$ROOT/calls.log"' "no check and reload"
  # A refused check restores the earlier route and reloads nothing.
  local before
  before=$(cat "$route")
  : >"$ROOT/calls.log"
  NGINX_FAIL=1 installer "${WEBSITE[@]}" --proxy nginx --port 3975
  check '[[ $CODE != 0 && $OUT == *"the earlier state is back"* ]]' "a refused check went on: $OUT"
  check '[[ $(cat "$route") == "$before" ]]' "the earlier route was not restored"
  check '! grep -q "^systemctl reload nginx" "$ROOT/calls.log"' "nginx was reloaded after a refused check"
  teardown
}

case_caddy() {
  setup website-caddy
  mkdir -p "$ROOT/site/deploy/site/routes"
  local routes="$ROOT/site/deploy/site/routes"
  installer "${WEBSITE[@]}" --proxy caddy --routes-dir "$routes"
  check '[[ $CODE == 0 ]]' "the install stopped: $OUT"
  local route="$routes/cases.caddy" env="$ROOT/etc/seasonal-cases/cases.env" state="$ROOT/etc/seasonal-cases/install.conf"
  check '[[ $(mode_of "$route") == 600 ]]' "the route file is not 0600"
  check 'grep -q "respond @sc_card 404" "$route" && grep -q "forward_auth @sc_signin site:3800" "$route"' "Caddy route wrong"
  check 'grep -q "reverse_proxy sc-cases:3970" "$route"' "the game is not reached on the network"
  check 'grep -q "^docker exec caddy123 caddy validate" "$ROOT/calls.log"' "no Caddy check"
  check '[[ $OUT == *"no account-changes feed"* ]]' "the missing feed was not said"
  # The trusted range: the website network's ranges, remembered and named in the route file (D37) …
  check '[[ $(value "$state" SC_TRUSTED_PROXIES) == 172.18.0.0/16 ]]' "the range was not remembered"
  check 'grep -q "^# The game trusts X-Forwarded-For from 172.18.0.0/16" "$route"' "the range is not in the route file"
  # … or the operator's narrower answer, in the state, the settings and the route file; the token
  # once the website wrote it.
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
  check '[[ $CODE != 0 && $OUT == *"--update needs an installed game"* ]]' "an update without an install went on"
  installer "${LOCAL[@]}" --db create
  check '[[ $CODE != 0 && $OUT == *"unknown option --db"* ]]' "a native option was taken: $OUT"
  installer "${LOCAL[@]}" --repo -u
  check '[[ $CODE != 0 && $OUT == *"SC_REPO must be"* ]]' "a repository option went on: $OUT"
  local answers="$ROOT/answers"
  printf 'SC_INSTALL_MODE=local\nSC_PORT=3980\nSC_EDGE_SUBNET=172.30.99.0/24\nSC_PUBLIC_ORIGIN=https://c.example.org\nSC_REF=master\n' >"$answers"
  installer --answers "$answers" --yes
  check '[[ $CODE == 0 && $(value "$ROOT/etc/seasonal-cases/cases.env" SC_TRUSTED_PROXIES) == 172.30.99.1 ]]' "the answers file was not used: $OUT"
  teardown
}

case_local
case_nginx
case_caddy
case_refusals
printf '%s passed, %s failed\n' "$PASSED" "$FAILED"
((FAILED == 0))
