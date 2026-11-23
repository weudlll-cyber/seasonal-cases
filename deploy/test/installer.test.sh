#!/usr/bin/env bash
# @file   deploy/test/installer.test.sh
# @brief  The installer's dry-run harness: every question path and every file it writes, without
#         root, packages or a network.
#
# Responsibility: each case runs deploy/install.sh against a temporary root (SC_ROOT) with stub
#                 commands first on PATH (apt-get, dpkg, node, corepack, git, pnpm, useradd, id,
#                 systemctl, curl, runuser, createdb, nginx, docker, chown) that log their calls.
#                 It checks: the files and their modes (0600 for settings and routes), that no
#                 secret appears in the output, that a re-run changes nothing, --check, --update,
#                 both website proxies with their route files, a refused proxy check restoring
#                 the previous route, and the refusals (a missing answer, a wrong one, an update
#                 without an install). Runs on Linux (CI's `deploy` job; locally in an Ubuntu
#                 container). Every case removes its temporary root.
# Depends on:     bash 4+, coreutils, ../install.sh
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

# A fresh root with the stubs; ROOT and STUBS are set for the case.
setup() {
  CASE=$1
  ROOT=$(mktemp -d)
  STUBS="$ROOT/stubs"
  mkdir -p "$STUBS" "$ROOT/etc"
  printf 'ID=ubuntu\nVERSION_ID="24.04"\n' >"$ROOT/etc/os-release"
  local cmd
  for cmd in apt-get dpkg node corepack git pnpm useradd id systemctl curl runuser createdb nginx docker chown sleep; do
    cat >"$STUBS/$cmd" <<'STUB'
#!/usr/bin/env bash
name=$(basename "$0")
printf '%s %s\n' "$name" "$*" >>"$SC_ROOT/calls.log"
case $name in
  dpkg) exit 1 ;;
  node) [[ $1 == --version ]] && printf 'v22.11.0\n' ;;
  id) [[ -f $SC_ROOT/.user ]] || exit 1 ;;
  useradd) touch "$SC_ROOT/.user" ;;
  git) [[ $1 == clone ]] && mkdir -p "${*: -1}/.git" ;;
  curl) for ((i = 1; i <= $#; i++)); do [[ ${!i} == -o ]] && { j=$((i + 1)); : >"${!j}" 2>/dev/null; }; done
        printf '{"ok":true}' ;;
  runuser)
    if [[ $* == *"SELECT 1 FROM pg_roles"* ]]; then [[ -f $SC_ROOT/.role ]] && printf '1\n'
    elif [[ $* == *"SELECT 1 FROM pg_database"* ]]; then [[ -f $SC_ROOT/.db ]] && printf '1\n'
    elif [[ $* == *createdb* ]]; then touch "$SC_ROOT/.db"
    else cat >/dev/null; touch "$SC_ROOT/.role"; fi ;;
  nginx) [[ -n ${NGINX_FAIL:-} ]] && exit 1 ;;
  docker) [[ $1 == ps ]] && printf 'caddy123\n' ;;
esac
exit 0
STUB
    chmod +x "$STUBS/$cmd"
  done
}

teardown() { rm -rf "$ROOT"; }

# Runs the installer in the case's root; output in $OUT, exit code in $CODE.
installer() {
  OUT=$(SC_ROOT="$ROOT" PATH="$STUBS:$PATH" bash "$INSTALL" --repo https://example.org/cases.git "$@" 2>&1 </dev/null)
  CODE=$?
}

LOCAL=(--mode local --port 3970 --db create --origin https://cases.example.org --ref master --yes)

case_local() {
  setup local
  installer "${LOCAL[@]}" --smtp-host 127.0.0.1 --smtp-port 1025
  check '[[ $CODE == 0 ]]' "the install stopped: $OUT"
  local env="$ROOT/etc/seasonal-cases/cases.env" state="$ROOT/etc/seasonal-cases/install.conf"
  check '[[ $(mode_of "$env") == 600 && $(mode_of "$state") == 600 ]]' "settings not 0600"
  check 'grep -q "^NODE_ENV='"'"'production'"'"'" "$env"' "no NODE_ENV"
  check 'grep -q "^SC_PUBLIC_ORIGIN='"'"'https://cases.example.org'"'"'" "$env"' "no public origin"
  check 'grep -q "^SC_SMTP_PORT='"'"'1025'"'"'" "$env"' "no SMTP port"
  check '! grep -q "SC_DATA_KEY\|SC_COOKIE_SECRET\|DB_PASSWORD" "$state"' "a secret in the state file"
  check '! grep -q "SC_RECOVERY_KEY" "$state"' "the recovery key in the state file"
  local key cookie recovery
  key=$(grep '^SC_DATA_KEY=' "$env" | cut -d"'" -f2)
  cookie=$(grep '^SC_COOKIE_SECRET=' "$env" | cut -d"'" -f2)
  recovery=$(grep '^SC_RECOVERY_KEY=' "$env" | cut -d"'" -f2)
  check '[[ ${#key} == 64 && ${#cookie} == 64 && ${#recovery} == 64 ]]' "secrets not made"
  check '[[ $recovery != "$key" ]]' "the recovery key is the data key"
  check '[[ $OUT != *"$key"* && $OUT != *"$cookie"* && $OUT != *"$recovery"* ]]' "a secret was printed"
  check 'grep -q "^runuser .*createdb -O seasonal_cases seasonal_cases" "$ROOT/calls.log"' "no database created"
  check 'grep -q "^pnpm build" "$ROOT/calls.log"' "no build"
  check 'grep -q "^systemctl restart seasonal-cases" "$ROOT/calls.log"' "no restart"
  check '! grep -q "^chown" "$ROOT/calls.log"' "the code was handed to the service user"
  check 'grep -q "^ExecStart=/usr/bin/node --import=tsx src/start.ts" "$ROOT/etc/systemd/system/seasonal-cases.service"' "no unit"
  # A re-run with the same answers changes nothing and keeps the secrets.
  installer "${LOCAL[@]}" --smtp-host 127.0.0.1 --smtp-port 1025
  check '[[ $OUT == *"done (0 change(s))"* ]]' "a re-run changed something: $OUT"
  check 'grep -q "$key" "$env"' "the data key changed"
  # --check names a change and makes none.
  installer --check --port 3971
  check '[[ $OUT == *"would write /etc/seasonal-cases/cases.env"* && $OUT == *"none was"* ]]' "--check: $OUT"
  check 'grep -q "^SC_PORT='"'"'3970'"'"'" "$env"' "--check changed the port"
  # --update takes a new ref and keeps the rest.
  installer --update --ref v1.0.0
  check '[[ $CODE == 0 ]] && grep -Eq "checkout --quiet --force (origin/)?v1.0.0" "$ROOT/calls.log"' "--update: $OUT"
  check 'grep -q "^SC_REF='"'"'v1.0.0'"'"'" "$state"' "the new ref was not remembered"
  teardown
}

website_root() {
  mkdir -p "$ROOT/etc/seasonal/routes"
  printf '3800\n' >"$ROOT/etc/seasonal/site-local-port"
  printf '%s\n' "$(printf 'ab%.0s' {1..32})" >"$ROOT/etc/seasonal/games-sync-token"
}

WEBSITE=(--mode website --port 3970 --db create --website-origin https://example.org --ref master --yes)

case_nginx() {
  setup website-nginx
  website_root
  installer "${WEBSITE[@]}" --proxy nginx
  check '[[ $CODE == 0 ]]' "the install stopped: $OUT"
  local route="$ROOT/etc/seasonal/routes/cases.conf" env="$ROOT/etc/seasonal-cases/cases.env" secret
  check '[[ $(mode_of "$route") == 600 ]]' "the route file is not 0600"
  secret=$(grep '^SC_PROXY_SECRET=' "$env" | cut -d"'" -f2)
  check 'grep -q "proxy_set_header X-Sc-Proxy-Secret \"$secret\";" "$route"' "the secret is not in the sign-in route"
  check 'grep -q "location ^~ /games/cases/api/website/ { return 404; }" "$route"' "the card is not denied"
  check 'grep -q "proxy_set_header X-Acting-User-Id \"\";" "$route"' "forged identity headers are not cleared"
  check '[[ $(grep -c "proxy_set_header Cookie \$sc_cookie;" "$route") == 2 ]]' "the website cookie is not stripped on both routes"
  check 'grep -q "proxy_pass http://127.0.0.1:3800/api/games/cases/authorize;" "$route"' "no authorize call"
  check 'grep -q "^SC_WEBSITE_LOCAL_ORIGIN='"'"'http://127.0.0.1:3800'"'"'" "$env"' "no feed origin"
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
  installer "${WEBSITE[@]}" --proxy caddy --routes-dir "$ROOT/site/deploy/site/routes"
  check '[[ $CODE == 0 ]]' "the install stopped: $OUT"
  local route="$ROOT/site/deploy/site/routes/cases.caddy"
  check '[[ $(mode_of "$route") == 600 ]]' "the route file is not 0600"
  check 'grep -q "respond @sc_card 404" "$route" && grep -q "forward_auth @sc_signin site:3800" "$route"' "Caddy route wrong"
  check 'grep -q "reverse_proxy 172.17.0.1:3970" "$route"' "the game is not reached on the bridge"
  check 'grep -q "^docker exec caddy123 caddy validate" "$ROOT/calls.log"' "no Caddy check"
  check '[[ $OUT == *"no account-changes feed"* ]]' "the missing feed was not said"
  # The trusted range: today's default, remembered and named in the route file (D37) …
  local state="$ROOT/etc/seasonal-cases/install.conf"
  check 'grep -q "^SC_TRUSTED_PROXIES='"'"'172.16.0.0/12'"'"'" "$state"' "the default range was not remembered"
  check 'grep -q "^# The game trusts X-Forwarded-For from 172.16.0.0/12" "$route"' "the range is not in the route file"
  # … or the operator's narrower answer, in the state, the settings and the route file.
  installer "${WEBSITE[@]}" --proxy caddy --routes-dir "$ROOT/site/deploy/site/routes" --proxies 172.18.0.0/16
  check 'grep -q "^SC_TRUSTED_PROXIES='"'"'172.18.0.0/16'"'"'" "$state"' "the answer was not remembered"
  check 'grep -q "^SC_TRUSTED_PROXIES='"'"'172.18.0.0/16'"'"'" "$ROOT/etc/seasonal-cases/cases.env"' "the answer is not in the settings"
  check 'grep -q "^# The game trusts X-Forwarded-For from 172.18.0.0/16" "$route"' "the answer is not in the route file"
  teardown
}

case_refusals() {
  setup refusals
  installer --mode local --port 3970 --db create --ref master --yes
  check '[[ $CODE != 0 && $OUT == *"missing answer for: SC_PUBLIC_ORIGIN"* ]]' "a missing answer went on: $OUT"
  installer "${LOCAL[@]}" --mode cloud
  check '[[ $CODE != 0 && $OUT == *"SC_INSTALL_MODE must be local or website"* ]]' "a wrong mode went on: $OUT"
  installer --update
  check '[[ $CODE != 0 && $OUT == *"--update needs an installed game"* ]]' "an update without an install went on"
  installer "${LOCAL[@]}" --db postgres://u:secret@db/c
  check '[[ $CODE != 0 && $OUT == *"SC_DB must be create or url"* && $OUT != *secret* ]]' "a database URL as a flag went on: $OUT"
  installer "${LOCAL[@]}" --repo -u
  check '[[ $CODE != 0 && $OUT == *"SC_REPO must be"* ]]' "a repository option went on: $OUT"
  local answers="$ROOT/answers"
  printf 'SC_INSTALL_MODE=local\nSC_PORT=3980\nSC_DB=url\nDATABASE_URL=postgres://u:p@db:5432/c\nSC_PUBLIC_ORIGIN=https://c.example.org\nSC_REF=master\n' >"$answers"
  installer --answers "$answers" --yes
  check '[[ $CODE == 0 ]] && grep -q "^DATABASE_URL='"'"'postgres://u:p@db:5432/c'"'"'" "$ROOT/etc/seasonal-cases/cases.env"' "the answers file was not used: $OUT"
  check '! grep -q "createdb" "$ROOT/calls.log"' "a database was created for a given URL"
  teardown
}

case_local
case_nginx
case_caddy
case_refusals
printf '%s passed, %s failed\n' "$PASSED" "$FAILED"
((FAILED == 0))
