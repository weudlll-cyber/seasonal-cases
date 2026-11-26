#!/usr/bin/env bash
# @file   deploy/start.sh
# @brief  Starts an installed game after a restore: the database roles again, then the stack.
#
# Responsibility: the backup's start command (./lib/backup.sh). A restored dump belongs to the
#                 superuser and carries no grants, so the kit's db-roles give the schema back to
#                 the owner role, and `up -d` (not `start`) runs the migration service, which
#                 grants the app role, before the game starts (DECISIONS D82). Root only.
# Depends on:     ./lib/common.sh, ./lib/app.sh, docker compose
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=deploy/lib/common.sh
. "$HERE/lib/common.sh"
# shellcheck source=deploy/lib/app.sh
. "$HERE/lib/app.sh"

[[ $EUID -eq 0 || -n $SC_ROOT ]] || die "run it with sudo"
load_values "$STATE_FILE" SC_INSTALL_MODE
[[ -n ${SC_INSTALL_MODE:-} ]] || die "no installed game here ($STATE_FILE is missing)"
start_stack
