#!/usr/bin/env bash
# @file   deploy/lib/backup.sh
# @brief  The installer's backup: the kit's ops/backup.sh with this game's settings and its
#         nightly timer (DECISIONS D68, D78; the kit's docs/OPERATIONS.md).
#
# Responsibility: with the operator's age public key (SC_BACKUP_AGE_RECIPIENT, an install-time
#                 answer) install age, make the group that may pull the backups, write the backup's
#                 settings (/etc/seasonal-cases/backup.env, root
#                 0600: the database in its compose container, the secret files that must travel,
#                 how to stop the game and start it again with its database roles around a
#                 restore) and the systemd units the kit prints (its script is the copy in
#                 /opt/seasonal-cases/kit, ./app.sh), then enable the 03:30 timer. The game keeps no uploads, so no volume is
#                 named. Without a key nothing is set up and the install says so loudly.
# Depends on:     ./common.sh, ./host.sh (apt_install), docker, groupadd, systemctl
# shellcheck shell=bash

BACKUP_ENV="$ETC_DIR/backup.env"
BACKUP_DIR=/var/backups/seasonal-cases/prod
BACKUP_GROUP=cases-backup
# The drill's throw-away PostgreSQL: the stack's own image (ops/compose.yml).
BACKUP_PG_IMAGE=postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24

write_backup_env() {
  {
    printf '# Written by deploy/install.sh: the backup of Seasonal Cases (docs/INSTALL.md).\n'
    quoted SK_BACKUP_PREFIX cases
    quoted SK_BACKUP_ENV prod
    quoted SK_BACKUP_DIR "$BACKUP_DIR"
    quoted SK_BACKUP_AGE_RECIPIENT "$SC_BACKUP_AGE_RECIPIENT"
    quoted SK_BACKUP_DB_CONTAINER "$PROJECT-postgres-1"
    quoted SK_BACKUP_DB_USER seasonal_cases
    quoted SK_BACKUP_DB_NAME seasonal_cases
    # The schema the game's tables live in: a restore replaces it whole, in one transaction.
    quoted SK_BACKUP_DB_SCHEMA sc
    # The settings file holds the data, cookie, recovery and proxy secrets and the database's
    # password: a restored database cannot open what it sealed without them. It travels inside the
    # encryption.
    quoted SK_BACKUP_SECRET_FILES /etc/seasonal-cases/cases.env
    quoted SK_BACKUP_GROUP "$BACKUP_GROUP"
    quoted SK_BACKUP_STOP_CMD "docker compose -p $PROJECT stop app"
    quoted SK_BACKUP_START_CMD "bash /opt/seasonal-cases/app/deploy/start.sh"
    quoted SK_BACKUP_PG_IMAGE "$BACKUP_PG_IMAGE"
    quoted SK_BACKUP_ENV_FILE /etc/seasonal-cases/backup.env
  } | put_file "$BACKUP_ENV" 0600
}

# The kit prints the three units, each after a "# ---- <path>" line.
write_backup_units() {
  local printed line path='' body=''
  if [[ ! -r $BACKUP_SCRIPT ]]; then
    info "would write the backup's systemd units"
    return 0
  fi
  printed=$(SK_BACKUP_PREFIX=cases SK_BACKUP_ENV_FILE=/etc/seasonal-cases/backup.env bash "$BACKUP_SCRIPT" print-units) ||
    die "the kit's backup script did not print its units"
  while IFS= read -r line; do
    if [[ $line == '# ---- '* ]]; then
      [[ -n $path ]] && printf '%s\n' "${body%$'\n'}" | put_file "$SC_ROOT$path" 0644
      path=${line#'# ---- '}
      body=''
    else
      body+="$line"$'\n'
    fi
  done <<<"$printed"
  [[ -n $path ]] || die "the kit's backup script printed no unit"
  printf '%s\n' "${body%$'\n'}" | put_file "$SC_ROOT$path" 0644
}

write_backup() {
  step "backup"
  if [[ -z ${SC_BACKUP_AGE_RECIPIENT:-} ]]; then
    warn "NO BACKUP is set up: make a key on your own computer (age-keygen), then run the installer again with --backup-recipient age1…"
    return 0
  fi
  apt_install age
  run groupadd -f --system "$BACKUP_GROUP"
  write_backup_env
  write_backup_units
  run systemctl daemon-reload
  run systemctl enable --now cases-backup@prod.timer
}

# Before an update: the backup of the running game. Without a configured backup it only warns.
backup_before_update() {
  step "backup before the update"
  if [[ ! -r $BACKUP_ENV || ! -r $BACKUP_SCRIPT ]]; then
    warn "no backup is set up: updating without one"
    return 0
  fi
  if ((DRY_RUN)); then
    info "would back up first"
    return 0
  fi
  (
    set -a
    # shellcheck source=/dev/null
    . "$BACKUP_ENV"
    set +a
    bash "$BACKUP_SCRIPT" backup
  ) || die "the backup before the update failed: nothing was changed"
}
