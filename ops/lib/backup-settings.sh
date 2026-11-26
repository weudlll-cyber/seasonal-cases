#!/usr/bin/env bash
# @file   ops/lib/backup-settings.sh
# @brief  The game's settings for the kit's backup (ops/backup.sh), and its nightly timer
#         (DECISIONS D68, D78; the kit's docs/OPERATIONS.md).
#
# Responsibility: `backup_lines` names what a backup of this game holds: the database in its compose
#                 container, the keys' file that must travel with it, how to stop the game and
#                 start it again with its database roles around a restore. The game keeps no
#                 uploads, so no volume is named. With the operator's age public key
#                 (SC_BACKUP_AGE_RECIPIENT, an install-time answer) the installer installs age,
#                 makes the group that may pull the backups, writes those lines and the key to
#                 /etc/seasonal-cases/backup.conf (root 0600; not *.env, which the admin command
#                 reads as an environment), writes the systemd units the kit prints and enables the
#                 03:30 timer. Without a key nothing is set up and the install says so loudly.
# Depends on:     ./common.sh, ./host.sh (apt_install), the kit's ops/backup.sh, groupadd, systemctl
# shellcheck shell=bash

BACKUP_CONF="$ETC_DIR/backup.conf"
BACKUP_DIR="$SC_ROOT/var/backups/seasonal-cases/prod"
BACKUP_GROUP=cases-backup
# The drill's throw-away PostgreSQL: the stack's own image (ops/compose.yml).
BACKUP_PG_IMAGE=postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24

backup_lines() {
  quoted SK_BACKUP_PREFIX cases
  quoted SK_BACKUP_ENV prod
  quoted SK_BACKUP_DIR "$BACKUP_DIR"
  quoted SK_BACKUP_DB_CONTAINER "$PROJECT-postgres-1"
  quoted SK_BACKUP_DB_USER seasonal_cases
  quoted SK_BACKUP_DB_NAME seasonal_cases
  # The schema the game's tables live in: a restore replaces it whole, in one transaction.
  quoted SK_BACKUP_DB_SCHEMA sc
  # The keys travel inside the encryption: a restored database cannot open what it sealed without
  # them. The database's passwords stay the server's own (./app.sh sets the roles again).
  quoted SK_BACKUP_SECRET_FILES "$KEYS_FILE"
  quoted SK_BACKUP_GROUP "$BACKUP_GROUP"
  quoted SK_BACKUP_STOP_CMD "docker compose -p $PROJECT stop app"
  # Not a plain start: a restored database needs its roles and grants again (D82).
  quoted SK_BACKUP_START_CMD "$COMMAND_LINK start"
  quoted SK_BACKUP_PG_IMAGE "$BACKUP_PG_IMAGE"
  quoted SK_BACKUP_ENV_FILE "$BACKUP_CONF"
}

# The kit prints the three units, each after a "# ---- <path>" line.
write_backup_units() {
  local printed line path='' body=''
  if [[ ! -r $BACKUP_SCRIPT ]]; then
    info "would write the backup's systemd units"
    return 0
  fi
  printed=$(SK_BACKUP_PREFIX=cases SK_BACKUP_ENV_FILE="$BACKUP_CONF" bash "$BACKUP_SCRIPT" print-units) ||
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
    warn "NO BACKUP is set up, and scases update will refuse: make a key on your own computer (age-keygen), then run the installer again with --backup-recipient age1…"
    return 0
  fi
  apt_install age
  run groupadd -f --system "$BACKUP_GROUP"
  {
    printf '# Written by ops/install.sh: the backup of Seasonal Cases (docs/operator-guide.md).\n'
    backup_lines
    quoted SK_BACKUP_AGE_RECIPIENT "$SC_BACKUP_AGE_RECIPIENT"
  } | put_file "$BACKUP_CONF" 0600
  write_backup_units
  run systemctl daemon-reload
  run systemctl enable --now cases-backup@prod.timer
}
