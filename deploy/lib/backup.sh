#!/usr/bin/env bash
# @file   deploy/lib/backup.sh
# @brief  The installer's backup: the kit's ops/backup.sh with this game's settings and its
#         nightly timer (DECISIONS D68; the kit's docs/OPERATIONS.md).
#
# Responsibility: with the operator's age public key (SC_BACKUP_AGE_RECIPIENT, an install-time
#                 answer) install age, make the group that may pull the backups, write the
#                 backup's settings (/etc/seasonal-cases/backup.env, root 0600: the database
#                 address without its password, the password beside it as PGPASSWORD, the secret
#                 files that must travel, how to stop and start the game around a restore) and the
#                 systemd units the kit prints, then enable the 03:30 timer. The game keeps no
#                 uploads, so no volume is named. Without a key nothing is set up and the install
#                 says so loudly. Two changes to the kit's printed units, because this install has
#                 no Docker: the units wait for PostgreSQL instead of requiring docker.service,
#                 and the script is run with bash from the installed code (a path that survives a
#                 kit update).
# Depends on:     ./common.sh, ./host.sh (apt_install), the installed code's
#                 node_modules/@seasonal/kit/ops/backup.sh, groupadd, systemctl
# shellcheck shell=bash

BACKUP_ENV="$ETC_DIR/backup.env"
BACKUP_DIR=/var/backups/seasonal-cases/prod
BACKUP_GROUP=cases-backup
# The kit's script in the installed code: the units and ./deploy/backup.sh run it.
BACKUP_SCRIPT="/opt/seasonal-cases/app/node_modules/@seasonal/kit/ops/backup.sh"
# The drill's throw-away PostgreSQL (the same major version, pinned like ops/compose.dev.yml).
BACKUP_PG_IMAGE=postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24

# A percent-encoded part of a URL, decoded.
url_decode() {
  local value=${1//+/%2B}
  printf '%b' "${value//%/\\x}"
}

# Splits DATABASE_URL into the address without its password (BACKUP_URL) and the password
# (BACKUP_PASSWORD), so no password is ever on a command line.
backup_database() {
  if [[ $DATABASE_URL =~ ^(postgres(ql)?://)([^:@/]+):([^@]*)@(.*)$ ]]; then
    BACKUP_URL="${BASH_REMATCH[1]}${BASH_REMATCH[3]}@${BASH_REMATCH[5]}"
    BACKUP_PASSWORD=$(url_decode "${BASH_REMATCH[4]}")
  else
    BACKUP_URL=$DATABASE_URL
    BACKUP_PASSWORD=''
  fi
}

write_backup_env() {
  backup_database
  {
    printf '# Written by deploy/install.sh: the backup of Seasonal Cases (docs/INSTALL.md).\n'
    quoted SK_BACKUP_PREFIX cases
    quoted SK_BACKUP_ENV prod
    quoted SK_BACKUP_DIR "$BACKUP_DIR"
    quoted SK_BACKUP_AGE_RECIPIENT "$SC_BACKUP_AGE_RECIPIENT"
    quoted SK_BACKUP_DB_URL "$BACKUP_URL"
    [[ -n $BACKUP_PASSWORD ]] && quoted PGPASSWORD "$BACKUP_PASSWORD"
    # The schema the game's tables live in: a restore replaces it whole, in one transaction.
    quoted SK_BACKUP_DB_SCHEMA sc
    # The settings file holds the data, cookie, recovery and proxy secrets: a restored database
    # cannot open what it sealed without them. It travels inside the encryption.
    quoted SK_BACKUP_SECRET_FILES /etc/seasonal-cases/cases.env
    quoted SK_BACKUP_GROUP "$BACKUP_GROUP"
    quoted SK_BACKUP_STOP_CMD "systemctl stop $SERVICE"
    quoted SK_BACKUP_START_CMD "systemctl start $SERVICE"
    quoted SK_BACKUP_PG_IMAGE "$BACKUP_PG_IMAGE"
    quoted SK_BACKUP_ENV_FILE /etc/seasonal-cases/backup.env
  } | put_file "$BACKUP_ENV" 0600
}

# One printed unit, fitted to this install.
put_unit() {
  local path=$1 body=$2
  body=${body//After=docker.service/After=postgresql.service}
  body=${body//$'Requires=docker.service\n'/}
  body=${body//ExecStart=*backup.sh backup/ExecStart=/usr/bin/bash $BACKUP_SCRIPT backup}
  printf '%s\n' "$body" | put_file "$SC_ROOT$path" 0644
}

# The kit prints the three units, each after a "# ---- <path>" line.
write_backup_units() {
  local script="$SC_ROOT$BACKUP_SCRIPT" printed line path='' body=''
  if [[ ! -r $script ]]; then
    ((DRY_RUN)) || die "the kit's backup script is missing ($BACKUP_SCRIPT): was the code built?"
    info "would write the backup's systemd units"
    return 0
  fi
  printed=$(SK_BACKUP_PREFIX=cases SK_BACKUP_ENV_FILE=/etc/seasonal-cases/backup.env bash "$script" print-units) ||
    die "the kit's backup script did not print its units"
  while IFS= read -r line; do
    if [[ $line == '# ---- '* ]]; then
      [[ -n $path ]] && put_unit "$path" "${body%$'\n'}"
      path=${line#'# ---- '}
      body=''
    else
      body+="$line"$'\n'
    fi
  done <<<"$printed"
  [[ -n $path ]] || die "the kit's backup script printed no unit"
  put_unit "$path" "${body%$'\n'}"
}

write_backup() {
  step "backup"
  if [[ -z ${SC_BACKUP_AGE_RECIPIENT:-} ]]; then
    warn "NO BACKUP is set up: make a key on your own computer (age-keygen), then run the installer again with --backup-recipient age1…"
    return 0
  fi
  apt_install age
  # The database client's tools (a local PostgreSQL brings them with it).
  [[ $SC_DB == url ]] && apt_install postgresql-client
  run groupadd -f --system "$BACKUP_GROUP"
  write_backup_env
  write_backup_units
  run systemctl daemon-reload
  run systemctl enable --now cases-backup@prod.timer
}
