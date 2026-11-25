#!/usr/bin/env bash
# @file   deploy/install.sh
# @brief  Installs or updates Seasonal Cases on a Debian or Ubuntu server, in one call:
#         `sudo ./deploy/install.sh` from a clone of this repository (docs/INSTALL.md).
#
# Responsibility: the one way Seasonal Cases runs on a server: the compose stack (ops/compose*.yml,
#                 DECISIONS D76). Check that Docker is there, ask once for what the server needs
#                 (mode, address, port, mail or the website's proxy) and remember it in
#                 /etc/seasonal-cases/install.conf (root, 0600; the secrets only in cases.env,
#                 0600). Then: the few packages, the code at the chosen ref, its image, the
#                 settings, the game's journal, the stack, the readiness check, in website mode the
#                 route file in the website's routes folder, and the encrypted nightly backup
#                 (./lib/backup.sh) once an age public key is given. `--update` takes the
#                 remembered answers and a new `--ref`, backs up first, then rebuilds and
#                 restarts; `--check` says what would change, changes nothing and reports the
#                 stack's health; `--answers FILE` and `--yes` run unattended. A re-run with the
#                 same answers changes nothing. After seasonal-mini-games ops/install.sh.
# Depends on:     ./lib/common.sh, ./lib/host.sh, ./lib/app.sh, ./lib/website.sh, ./lib/route.sh,
#                 ./lib/backup.sh, ../ops/compose*.yml (of the checked-out code)
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=deploy/lib/common.sh
. "$HERE/lib/common.sh"
# shellcheck source=deploy/lib/host.sh
. "$HERE/lib/host.sh"
# shellcheck source=deploy/lib/app.sh
. "$HERE/lib/app.sh"
# shellcheck source=deploy/lib/website.sh
. "$HERE/lib/website.sh"
# shellcheck source=deploy/lib/route.sh
. "$HERE/lib/route.sh"
# shellcheck source=deploy/lib/backup.sh
. "$HERE/lib/backup.sh"

# The remembered answers (no secrets: those live in the environment file).
ANSWERS=(SC_INSTALL_MODE SC_PUBLIC_ORIGIN SC_PORT SC_SMTP_HOST SC_SMTP_PORT SC_MAIL_FROM
  SC_WEBSITE_ORIGIN SC_WEBSITE_NETWORK SC_TRUSTED_PROXIES SC_EDGE_SUBNET SC_PROXY SC_ROUTES_DIR
  SC_SITE_PORT_FILE SC_REF SC_REPO SC_PRIVACY_CONTACT SC_BACKUP_AGE_RECIPIENT)
UPDATE=0
ANSWERS_FILE=''

usage() {
  cat <<'USAGE'
usage: sudo ./deploy/install.sh [options]
  --mode local|website     standalone with own accounts, or embedded under the website
  --origin URL             local mode: the address players open (https://cases.example.org)
  --port N                 the loopback port the game is published on (3970)
  --smtp-host H --smtp-port N --mail-from TEXT   local mode: the forgotten-password mail
  --website-origin URL     website mode: the website's address
  --proxy nginx|caddy      website mode: the website's proxy (found by itself when possible)
  --routes-dir DIR         website mode: the website's prepared routes folder
  --website-network NAME   website mode: the website's Docker network (found by itself)
  --edge-subnet CIDR       the game's own Docker network (172.30.251.0/24)
  --backup-recipient KEY   your age public key (age1…) for the encrypted nightly backup;
                           without one no backup is set up
  --proxies LIST           addresses whose X-Forwarded-For names the visitor
  --ref REF --repo URL     the tag or branch to run, and where to fetch it from
  --answers FILE           KEY=value lines with the answers (deploy/answers.example)
  --yes                    take defaults, stop on a missing answer instead of asking
  --update                 back up, fetch --ref (or the remembered one), build, restart
  --check                  say what would change and how the stack is; change nothing
USAGE
}

parse_flags() {
  while (($#)); do
    case $1 in
      --mode) SC_INSTALL_MODE=$2; shift ;;
      --origin) SC_PUBLIC_ORIGIN=$2; shift ;;
      --port) SC_PORT=$2; shift ;;
      --smtp-host) SC_SMTP_HOST=$2; shift ;;
      --smtp-port) SC_SMTP_PORT=$2; shift ;;
      --mail-from) SC_MAIL_FROM=$2; shift ;;
      --website-origin) SC_WEBSITE_ORIGIN=$2; shift ;;
      --proxy) SC_PROXY=$2; shift ;;
      --routes-dir) SC_ROUTES_DIR=$2; shift ;;
      --website-network) SC_WEBSITE_NETWORK=$2; shift ;;
      --edge-subnet) SC_EDGE_SUBNET=$2; shift ;;
      --proxies) SC_TRUSTED_PROXIES=$2; shift ;;
      --backup-recipient) SC_BACKUP_AGE_RECIPIENT=$2; shift ;;
      --ref) SC_REF=$2; shift ;;
      --repo) SC_REPO=$2; shift ;;
      --answers) ANSWERS_FILE=$2; shift ;;
      --yes) YES=1 ;;
      --update) UPDATE=1; YES=1 ;;
      --check) DRY_RUN=1; YES=1 ;;
      -h | --help) usage; exit 0 ;;
      *) usage >&2; die "unknown option $1" ;;
    esac
    shift
  done
}

# Flags first, then the answers file, then what an earlier run remembered.
load_answers() {
  if [[ -n $ANSWERS_FILE ]]; then
    [[ -r $ANSWERS_FILE ]] || die "cannot read the answers file $ANSWERS_FILE"
    load_values "$ANSWERS_FILE" "${ANSWERS[@]}"
  fi
  load_values "$STATE_FILE" "${ANSWERS[@]}"
  ((UPDATE)) && [[ ! -f $STATE_FILE ]] && die "--update needs an installed game; run the installer without it first"
  return 0
}

ask_common() {
  step "answers"
  ask SC_INSTALL_MODE "mode: local (own domain, own accounts) or website (under the website)" local
  must_match SC_INSTALL_MODE '^(local|website)$' "local or website"
  ask SC_PORT "the loopback port the game is published on" 3970
  must_match SC_PORT '^[0-9]{2,5}$' "a port number"
  ask SC_REPO "where to fetch the code from" "$(git -C "$HERE/.." remote get-url origin 2>/dev/null || true)"
  must_match SC_REPO '^(https://|git@|/)[^[:space:]]+$' "an https://, git@ or /path address"
  ask SC_REF "the tag or branch to run" "$(git -C "$HERE/.." rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  must_match SC_REF '^[A-Za-z0-9._/-]+$' "a tag or branch name"
  SC_EDGE_SUBNET=${SC_EDGE_SUBNET:-172.30.251.0/24}
  must_match SC_EDGE_SUBNET '^([0-9]{1,3}\.){3}0/24$' "a /24 network such as 172.30.251.0/24"
  ask_backup
}

# The operator's age public key; empty (or "none") sets up no backup, which the install says.
ask_backup() {
  if ((YES)); then SC_BACKUP_AGE_RECIPIENT=${SC_BACKUP_AGE_RECIPIENT:-}; else ask SC_BACKUP_AGE_RECIPIENT "your age public key for the encrypted backups (age1…; none: no backup)" none; fi
  [[ ${SC_BACKUP_AGE_RECIPIENT:-} == none ]] && SC_BACKUP_AGE_RECIPIENT=''
  [[ -z ${SC_BACKUP_AGE_RECIPIENT:-} ]] || must_match SC_BACKUP_AGE_RECIPIENT '^age1[0-9a-z]{58}$' "an age public key (age1… as age-keygen -y prints it)"
}

ask_local() {
  ask SC_PUBLIC_ORIGIN "the address players open (https://…)"
  must_match SC_PUBLIC_ORIGIN '^https?://[^/]+$' "an origin such as https://cases.example.org"
  # The proxy on this server reaches the published port: its connections arrive from the
  # gateway of the game's network.
  ask SC_TRUSTED_PROXIES "your reverse proxy's addresses, as the game sees them" "$(gateway_of "$SC_EDGE_SUBNET")"
  check_addresses
  if ((YES)); then SC_SMTP_HOST=${SC_SMTP_HOST:-}; else ask SC_SMTP_HOST "SMTP relay for the forgotten-password mail (empty: none)" none; fi
  [[ ${SC_SMTP_HOST:-} == none ]] && SC_SMTP_HOST=''
  if [[ -n ${SC_SMTP_HOST:-} ]]; then
    ask SC_SMTP_PORT "its port" 25
    ask SC_MAIL_FROM "the sender" "Seasonal Cases <cases@localhost>"
  fi
}

ask_website() {
  ask SC_WEBSITE_ORIGIN "the website's address (https://…)"
  must_match SC_WEBSITE_ORIGIN '^https://[^/]+$' "an https origin such as https://example.org"
  local found=caddy
  [[ -d $SC_ROOT/etc/seasonal/routes ]] && command -v nginx >/dev/null 2>&1 && found=nginx
  ask SC_PROXY "the website's proxy: nginx or caddy" "$found"
  must_match SC_PROXY '^(nginx|caddy)$' "nginx or caddy"
  if [[ $SC_PROXY == nginx ]]; then
    ask SC_ROUTES_DIR "the website's routes folder" "$SC_ROOT/etc/seasonal/routes"
    ask SC_SITE_PORT_FILE "the site's local port file" "$SC_ROOT/etc/seasonal/site-local-port"
  else
    ask SC_ROUTES_DIR "the website checkout's deploy/site/routes folder"
  fi
  keep_secret SC_PROXY_SECRET 32
  website_network
}

# The gateway of a /24 network: where the host's connections to a published port come from.
gateway_of() { printf '%s.1' "${1%.0/24}"; }

# The trusted addresses end up in the settings and route files: their form only.
check_addresses() {
  must_match SC_TRUSTED_PROXIES '^[0-9A-Fa-f:./]+(,[0-9A-Fa-f:./]+)*$' "addresses or networks, comma-separated"
}

write_state() {
  local key
  for key in "${ANSWERS[@]}"; do
    # An `if`, not `&&`: an empty last answer must not make the loop (and under pipefail the install) fail.
    if [[ -n ${!key:-} ]]; then quoted "$key" "${!key}"; fi
  done | put_file "$STATE_FILE" 0600
}

next_steps() {
  if ((DRY_RUN)); then
    step "check done: $CHANGES change(s) would be made, none was"
    return 0
  fi
  step "done ($CHANGES change(s))"
  if [[ $SC_INSTALL_MODE == local ]]; then
    info "open $SC_PUBLIC_ORIGIN behind your reverse proxy (to http://127.0.0.1:$SC_PORT)"
    info "first admin: register on the page, then: sudo ./deploy/admin.sh admin promote <name>"
  else
    info "open $SC_WEBSITE_ORIGIN/games/cases/; add the game's card in the website's Admin → Games"
  fi
  info "health: sudo ./deploy/install.sh --check; logs: sudo journalctl --namespace=$PROJECT"
  if [[ -n ${SC_BACKUP_AGE_RECIPIENT:-} ]]; then
    info "first backup: sudo ./deploy/backup.sh backup; pull and restore: docs/INSTALL.md"
  fi
}

main() {
  parse_flags "$@"
  [[ $EUID -eq 0 || -n $SC_ROOT ]] || die "run it with sudo"
  load_answers
  check_os
  check_docker
  ask_common
  if [[ $SC_INSTALL_MODE == local ]]; then ask_local; else ask_website; fi
  install_prereqs
  ((UPDATE)) && backup_before_update
  fetch_code
  build_image
  write_env
  write_journal
  write_state
  start_stack
  wait_ready
  [[ $SC_INSTALL_MODE == website ]] && install_route
  write_backup
  ((DRY_RUN)) && report_health
  next_steps
}

main "$@"
