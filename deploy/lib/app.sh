#!/usr/bin/env bash
# @file   deploy/lib/app.sh
# @brief  The game on the machine: its code at the chosen ref, its image, the settings, the
#         journal, the compose stack and its readiness (DECISIONS D76; after seasonal-mini-games
#         ops/lib/config.sh).
#
# Responsibility: the code in /opt/seasonal-cases/app (root's, a clone of SC_REPO at SC_REF) is the
#                 build context and holds the compose files (ops/); the image is built on the server,
#                 tagged with the commit and the mode; the env file (/etc/seasonal-cases/cases.env,
#                 root 0600) holds the compose settings and every setting of docs/CONFIG.md, the
#                 secrets made once and kept; the logs go to a journald namespace of the game's
#                 own whose retention is 14 days (DECISIONS D61); the stack is brought up with
#                 docker compose and the installer waits for /readyz; the health report of
#                 --check reads the running stack.
# Depends on:     ./common.sh, git, docker (with compose), systemctl, curl
# shellcheck shell=bash

# The code at SC_REF; answers the commit it stands on.
fetch_code() {
  step "code ($SC_REF)"
  if [[ -d $APP_DIR/.git ]]; then
    run git -C "$APP_DIR" fetch --tags --prune origin
  else
    run mkdir -p "$OPT_DIR"
    run git clone --quiet "$SC_REPO" "$APP_DIR"
  fi
  run git -C "$APP_DIR" -c advice.detachedHead=false checkout --quiet --force "origin/$SC_REF" 2>/dev/null ||
    run git -C "$APP_DIR" -c advice.detachedHead=false checkout --quiet --force "$SC_REF" ||
    die "the ref $SC_REF does not exist in $SC_REPO"
}

# Builds the image of the checked-out code for the mode; sets SC_IMAGE. Under --check the image
# of the settings stays.
build_image() {
  step "image ($SC_INSTALL_MODE mode)"
  if ((DRY_RUN)); then
    SC_IMAGE=$(file_value "$ENV_FILE" SC_IMAGE)
    info "would build the image from $SC_REF"
    return 0
  fi
  local commit version
  commit=$(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || true)
  commit=${commit:-unknown}
  version=$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' "$APP_DIR/package.json" | head -n 1)
  SC_IMAGE="seasonal-cases:$commit-$SC_INSTALL_MODE"
  run docker build --quiet \
    --build-arg SC_MODE="$SC_INSTALL_MODE" \
    --build-arg SC_VERSION="${version:-unknown}" \
    --build-arg SC_COMMIT="$commit" \
    -t "$SC_IMAGE" "$APP_DIR"
  info "built $SC_IMAGE (version ${version:-unknown})"
}

# Secrets made once: kept from the settings file on every later run.
keep_secret() {
  local var=$1 bytes=$2 value
  value=$(file_value "$ENV_FILE" "$var")
  [[ -n $value ]] || value=$(secret "$bytes")
  printf -v "$var" '%s' "$value"
}

write_env() {
  step "settings"
  keep_secret POSTGRES_PASSWORD 24
  keep_secret SC_DATA_KEY 32
  keep_secret SC_COOKIE_SECRET 32
  keep_secret SC_RECOVERY_KEY 32
  {
    printf '# Written by deploy/install.sh; every variable is in docs/CONFIG.md.\n'
    quoted SC_IMAGE "${SC_IMAGE:-seasonal-cases:not-built}"
    quoted SC_ENV_FILE /etc/seasonal-cases/cases.env
    quoted SC_HOST_PORT "$SC_PORT"
    quoted SC_EDGE_SUBNET "$SC_EDGE_SUBNET"
    quoted POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
    quoted SC_MODE "$SC_INSTALL_MODE"
    quoted SC_DATA_KEY "$SC_DATA_KEY"
    quoted SC_COOKIE_SECRET "$SC_COOKIE_SECRET"
    quoted SC_RECOVERY_KEY "$SC_RECOVERY_KEY"
    quoted SC_TRUSTED_PROXIES "$SC_TRUSTED_PROXIES"
    # An `if` per optional line: a false test must not be the block's last status.
    if [[ -n ${SC_PRIVACY_CONTACT:-} ]]; then quoted SC_PRIVACY_CONTACT "$SC_PRIVACY_CONTACT"; fi
    if [[ $SC_INSTALL_MODE == website ]]; then
      quoted SC_WEBSITE_NETWORK "$SC_WEBSITE_NETWORK"
      quoted SC_WEBSITE_ORIGIN "$SC_WEBSITE_ORIGIN"
      quoted SC_PROXY_SECRET "$SC_PROXY_SECRET"
      if [[ -n ${SC_GAMES_SYNC_TOKEN:-} ]]; then
        quoted SC_WEBSITE_LOCAL_ORIGIN "$SC_WEBSITE_LOCAL_ORIGIN"
        quoted SC_GAMES_SYNC_TOKEN "$SC_GAMES_SYNC_TOKEN"
      fi
    else
      quoted SC_PUBLIC_ORIGIN "$SC_PUBLIC_ORIGIN"
      if [[ -n ${SC_SMTP_HOST:-} ]]; then
        quoted SC_SMTP_HOST "$SC_SMTP_HOST"
        quoted SC_SMTP_PORT "${SC_SMTP_PORT:-25}"
        quoted SC_MAIL_FROM "${SC_MAIL_FROM:-Seasonal Cases <cases@localhost>}"
      fi
    fi
  } | put_file "$ENV_FILE" 0600
}

# The game's logs are kept 14 days, in a journal of their own: other services keep what the host
# keeps for them. Docker writes into it, so the journal's socket starts with Docker. Read them with
# `journalctl --namespace=seasonal-cases`.
write_journal() {
  put_file "$JOURNAL_CONF" 0644 <<'JOURNAL'
# Written by deploy/install.sh (Seasonal Cases): the game's logs are kept 14 days (DECISIONS D61).
[Journal]
MaxRetentionSec=14day
JOURNAL
  put_file "$DOCKER_DROPIN" 0644 <<'DROPIN'
# Written by deploy/install.sh (Seasonal Cases): the game's journal listens before Docker starts.
[Unit]
Wants=systemd-journald@seasonal-cases.socket
After=systemd-journald@seasonal-cases.socket
DROPIN
  run systemctl daemon-reload
  run systemctl start systemd-journald@seasonal-cases.socket
}

# docker compose for the installed stack: the project, the settings and the files of this mode.
compose() {
  local files=(-f "$APP_DIR/ops/compose.yml")
  [[ $SC_INSTALL_MODE == website ]] && files+=(-f "$APP_DIR/ops/compose.website.yml")
  files+=(-f "$APP_DIR/ops/compose.journal.yml")
  docker compose -p "$PROJECT" --env-file "$ENV_FILE" "${files[@]}" "$@"
}

start_stack() {
  step "stack"
  run compose up -d --remove-orphans
}

ready_url() {
  local base=/
  [[ $SC_INSTALL_MODE == website ]] && base=/games/cases/
  printf 'http://127.0.0.1:%s%sreadyz' "$SC_PORT" "$base"
}

# The base path's readiness, at most 120 s; the database and the migrations come first.
wait_ready() {
  local url tries
  url=$(ready_url)
  if ((DRY_RUN)); then
    info "would wait for $url"
    return 0
  fi
  for tries in $(seq 1 60); do
    if curl -fsS -o /dev/null "$url"; then
      info "ready after $((tries * 2)) s: $(curl -fsS "$url")"
      return 0
    fi
    sleep 2
  done
  die "the game did not become ready within 120 s; see: sudo journalctl --namespace=$PROJECT -n 50"
}

# --check: the running stack's containers and whether the game answers ready.
report_health() {
  step "health"
  [[ -f $ENV_FILE && -d $APP_DIR/ops ]] || {
    info "nothing is installed yet"
    return 0
  }
  compose ps --all 2>&1 | sed 's/^/  /' || info "docker compose could not read the stack"
  local url
  url=$(ready_url)
  if curl -fsS -o /dev/null "$url"; then
    info "ready: $(curl -fsS "$url")"
  else
    warn "the game does not answer ready at $url"
  fi
}
