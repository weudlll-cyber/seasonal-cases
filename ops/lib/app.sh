#!/usr/bin/env bash
# @file   ops/lib/app.sh
# @brief  The game on the machine: its code at the chosen ref, its image, the stack's files and the
#         kit's scripts, the settings, the journal, the compose stack with its database roles and
#         its readiness (DECISIONS D76, D82, D83; after seasonal-mini-games ops/lib/config.sh).
#
# Responsibility: the code in /opt/seasonal-cases/app (root's, a clone of SC_REPO at SC_REF) is the
#                 build context only; the image is built on the server, tagged with the commit and
#                 the mode. What runs is installed apart from it, so an update can build the next
#                 version without touching the running one: the compose files, these libraries and
#                 the command in /opt/seasonal-cases/stack (linked as /usr/local/bin/scases), and
#                 the kit's whole ops/ folder, copied out of the image, in /opt/seasonal-cases/kit,
#                 so the server needs no Node. The settings file (/etc/seasonal-cases/prod.env,
#                 root 0600) holds the compose settings and every setting of docs/CONFIG.md, the
#                 secrets made once and kept; the logs go to a journald namespace of the game's own
#                 whose retention is 14 days (D61). Before the game starts, the database's owner
#                 and app roles are set up with the kit's db-roles (which also converts an older
#                 database once). Used by ../install.sh and ../scases.
# Depends on:     ./common.sh, the kit's ops/lib/db-roles.sh, git, docker (with compose), systemctl,
#                 curl, tar, diff
# shellcheck shell=bash

# The code at SC_REF.
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
  SC_IMAGE="$IMAGE_REPO:$commit-$SC_INSTALL_MODE"
  run docker build --quiet \
    --build-arg SC_MODE="$SC_INSTALL_MODE" \
    --build-arg SC_VERSION="${version:-unknown}" \
    --build-arg SC_COMMIT="$commit" \
    -t "$SC_IMAGE" "$APP_DIR"
  info "built $SC_IMAGE (version ${version:-unknown})"
}

# Where the image carries the kit (the server's production dependency).
KIT_IN_IMAGE=/app/apps/server/node_modules/@seasonal/kit

# The kit's ops/ folder out of the image, whole: its scripts source each other. The new copy
# replaces the old one only once it is complete.
copy_kit() {
  step "the kit's scripts"
  if ((DRY_RUN)); then
    info "would copy the kit's ops/ folder out of the image"
    return 0
  fi
  local fresh="$KIT_DIR.new"
  rm -rf "$fresh"
  mkdir -p "$fresh"
  docker run --rm --entrypoint tar "$SC_IMAGE" -C "$KIT_IN_IMAGE" -cf - ops | tar -xf - -C "$fresh" ||
    die "the kit's ops folder could not be read from $SC_IMAGE"
  [[ -r $fresh/ops/backup.sh && -r $fresh/ops/lib/admin.sh ]] ||
    die "the kit's ops folder in $SC_IMAGE is incomplete"
  if [[ -d $KIT_DIR ]] && diff -rq "$fresh" "$KIT_DIR" >/dev/null 2>&1; then
    rm -rf "$fresh"
    return 0
  fi
  rm -rf "$KIT_DIR"
  mv "$fresh" "$KIT_DIR"
  CHANGES=$((CHANGES + 1))
  info "wrote ${KIT_DIR#"$SC_ROOT"}/ops"
}

# The checked-out ref's compose files, libraries and command, and the command's link.
install_stack() {
  step "the stack's files"
  if [[ ! -r $APP_DIR/ops/compose.yml ]]; then
    ((DRY_RUN)) || die "the code at $SC_REF has no ops/compose.yml"
    info "would install the stack's files"
    return 0
  fi
  local file
  for file in "$APP_DIR"/ops/compose.yml "$APP_DIR"/ops/compose.website.yml "$APP_DIR"/ops/compose.journal.yml; do
    put_file "$STACK_DIR/${file##*/}" 0644 <"$file"
  done
  for file in "$APP_DIR"/ops/lib/*.sh; do
    put_file "$STACK_DIR/lib/${file##*/}" 0644 <"$file"
  done
  put_file "$STACK_DIR/scases" 0755 <"$APP_DIR/ops/scases"
  [[ $(readlink "$COMMAND_LINK" 2>/dev/null) == "$STACK_DIR/scases" ]] && return 0
  run mkdir -p "${COMMAND_LINK%/*}"
  run ln -sfn "$STACK_DIR/scases" "$COMMAND_LINK"
  CHANGES=$((CHANGES + 1))
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
  keep_secret SC_DB_OWNER_PASSWORD 24
  keep_secret SC_DB_APP_PASSWORD 24
  keep_secret SC_DATA_KEY 32
  keep_secret SC_COOKIE_SECRET 32
  keep_secret SC_RECOVERY_KEY 32
  {
    printf '# Written by ops/install.sh; every variable is in docs/CONFIG.md.\n'
    quoted SC_IMAGE "${SC_IMAGE:-$IMAGE_REPO:not-built}"
    quoted SC_ENV_FILE "${ENV_FILE#"$SC_ROOT"}"
    quoted SC_HOST_PORT "$SC_PORT"
    quoted SC_EDGE_SUBNET "$SC_EDGE_SUBNET"
    quoted POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
    quoted SC_DB_OWNER_PASSWORD "$SC_DB_OWNER_PASSWORD"
    quoted SC_DB_APP_PASSWORD "$SC_DB_APP_PASSWORD"
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
# Written by ops/install.sh (Seasonal Cases): the game's logs are kept 14 days (DECISIONS D61).
[Journal]
MaxRetentionSec=14day
JOURNAL
  put_file "$DOCKER_DROPIN" 0644 <<'DROPIN'
# Written by ops/install.sh (Seasonal Cases): the game's journal listens before Docker starts.
[Unit]
Wants=systemd-journald@seasonal-cases.socket
After=systemd-journald@seasonal-cases.socket
DROPIN
  run systemctl daemon-reload
  run systemctl start systemd-journald@seasonal-cases.socket
}

# docker compose for the installed stack: the project, the settings and the files of this mode.
compose() {
  local files=(-f "$STACK_DIR/compose.yml")
  [[ $SC_INSTALL_MODE == website ]] && files+=(-f "$STACK_DIR/compose.website.yml")
  files+=(-f "$STACK_DIR/compose.journal.yml")
  docker compose -p "$PROJECT" --env-file "$ENV_FILE" "${files[@]}" "$@"
}

# The database, then its roles: made, or converted from an older database; on one that has them
# only the passwords are the settings' again. They reach psql on standard input only.
database_roles() {
  step "database roles"
  if ((DRY_RUN)); then
    info "would set up the database's owner and app roles"
    return 0
  fi
  compose up -d --wait postgres
  # shellcheck source=/dev/null
  . "$KIT_DIR/ops/lib/db-roles.sh"
  SK_DB_PREFIX=sc \
    SK_DB_OWNER_PASSWORD=$(file_value "$ENV_FILE" SC_DB_OWNER_PASSWORD) \
    SK_DB_APP_PASSWORD=$(file_value "$ENV_FILE" SC_DB_APP_PASSWORD) \
    sk_db_roles_apply compose exec -T postgres \
    psql -X -q -v ON_ERROR_STOP=1 -U seasonal_cases -d seasonal_cases ||
    die "the database roles could not be set up"
}

# The roles, then the stack: the migration service and the game.
start_stack() {
  database_roles
  step "stack"
  run compose up -d --remove-orphans
}

base_path() {
  if [[ $SC_INSTALL_MODE == website ]]; then printf '/games/cases/'; else printf '/'; fi
}

ready_url() { printf 'http://127.0.0.1:%s%sreadyz' "$SC_PORT" "$(base_path)"; }

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
  [[ -f $ENV_FILE && -r $STACK_DIR/compose.yml ]] || {
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
