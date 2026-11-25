#!/usr/bin/env bash
# @file   deploy/lib/app.sh
# @brief  The game on the machine: its user, its code at the chosen ref, the build, the
#         environment file, the systemd unit, the start and the readiness check.
#
# Responsibility: a system user without a shell runs the game; the code in /opt/seasonal-cases
#                 stays root's and read-only for it (root runs that code too, for updates and
#                 deploy/admin.sh, so the service must not be able to change it: security pass
#                 2, finding 1); the code
#                 is a clone of SC_REPO at SC_REF (a tag or branch); `pnpm install --frozen-lockfile`
#                 and `pnpm build` for the mode; the environment file (/etc/seasonal-cases/cases.env,
#                 root 0600, read by systemd) holds every setting of docs/CONFIG.md and the
#                 secrets, generated once and kept; the unit runs `node … start.ts` as that user,
#                 hardened, with its logs in a journald namespace of its own whose retention is
#                 14 days (DECISIONS D61); the server migrates the database on start; the
#                 installer waits for /readyz (the kit's health names, D69).
# Depends on:     ./common.sh, git, pnpm, useradd, systemctl, curl
# shellcheck shell=bash

ensure_user() {
  if id -u "$SERVICE_USER" >/dev/null 2>&1; then
    info "user $SERVICE_USER exists"
  else
    run useradd --system --home-dir "$OPT_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
    info "user $SERVICE_USER created"
  fi
}

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

build_app() {
  step "build ($SC_INSTALL_MODE mode)"
  run env -C "$APP_DIR" pnpm install --frozen-lockfile
  run env -C "$APP_DIR" SC_MODE="$SC_INSTALL_MODE" pnpm build
}

# Secrets made once: kept from the environment file on every later run.
keep_secret() {
  local var=$1 bytes=$2 value
  value=$(file_value "$ENV_FILE" "$var")
  [[ -n $value ]] || value=$(secret "$bytes")
  printf -v "$var" '%s' "$value"
}

write_env() {
  step "settings"
  keep_secret SC_DATA_KEY 32
  keep_secret SC_COOKIE_SECRET 32
  keep_secret SC_RECOVERY_KEY 32
  {
    printf '# Written by deploy/install.sh; every variable is in docs/CONFIG.md.\n'
    quoted NODE_ENV production
    quoted SC_MODE "$SC_INSTALL_MODE"
    quoted SC_PORT "$SC_PORT"
    quoted SC_HOST "$SC_HOST"
    quoted DATABASE_URL "$DATABASE_URL"
    [[ -n ${SC_DB_PASSWORD:-} ]] && quoted SC_DB_PASSWORD "$SC_DB_PASSWORD"
    quoted SC_DATA_KEY "$SC_DATA_KEY"
    quoted SC_COOKIE_SECRET "$SC_COOKIE_SECRET"
    quoted SC_RECOVERY_KEY "$SC_RECOVERY_KEY"
    quoted SC_CLIENT_DIR "/opt/seasonal-cases/app/apps/web/dist"
    quoted SC_TRUSTED_PROXIES "$SC_TRUSTED_PROXIES"
    [[ -n ${SC_PRIVACY_CONTACT:-} ]] && quoted SC_PRIVACY_CONTACT "$SC_PRIVACY_CONTACT"
    if [[ $SC_INSTALL_MODE == website ]]; then
      quoted SC_WEBSITE_ORIGIN "$SC_WEBSITE_ORIGIN"
      quoted SC_PROXY_SECRET "$SC_PROXY_SECRET"
      if [[ -n ${SC_WEBSITE_LOCAL_ORIGIN:-} && -n ${SC_GAMES_SYNC_TOKEN:-} ]]; then
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

write_unit() {
  put_file "$UNIT_FILE" 0644 <<UNIT
# Written by deploy/install.sh (Seasonal Cases).
[Unit]
Description=Seasonal Cases
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=/opt/seasonal-cases/app/apps/server
EnvironmentFile=/etc/seasonal-cases/cases.env
ExecStart=/usr/bin/node --import=tsx src/start.ts
Restart=on-failure
RestartSec=3
TimeoutStopSec=15
KillSignal=SIGTERM
LogNamespace=seasonal-cases
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
}

# The game's logs are kept 14 days, in a journal of their own: other services keep what the host
# keeps for them. Read them with `journalctl --namespace=seasonal-cases -u seasonal-cases`.
write_journal() {
  put_file "$JOURNAL_CONF" 0644 <<'JOURNAL'
# Written by deploy/install.sh (Seasonal Cases): the game's logs are kept 14 days (DECISIONS D61).
[Journal]
MaxRetentionSec=14day
JOURNAL
}

start_service() {
  step "service"
  run systemctl daemon-reload
  run systemctl enable "$SERVICE"
  run systemctl restart "$SERVICE"
}

# The base path's readiness, at most 90 s; the database and the migrations come first.
wait_ready() {
  local base=/ url tries
  [[ $SC_INSTALL_MODE == website ]] && base=/games/cases/
  url="http://$SC_HOST:$SC_PORT${base}readyz"
  if ((DRY_RUN)); then
    info "would wait for $url"
    return 0
  fi
  for tries in $(seq 1 45); do
    if curl -fsS -o /dev/null "$url"; then
      info "ready after $((tries * 2)) s: $(curl -fsS "http://$SC_HOST:$SC_PORT${base}healthz")"
      return 0
    fi
    sleep 2
  done
  die "the game did not become ready within 90 s; see: journalctl --namespace=$SERVICE -u $SERVICE -n 50"
}
