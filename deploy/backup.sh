#!/usr/bin/env bash
# @file   deploy/backup.sh
# @brief  The kit's backup commands on an installed game: `sudo ./deploy/backup.sh backup`,
#         `… restore <file> --identity key.txt`, `… drill <file> --identity key.txt`
#         (docs/INSTALL.md, docs/OPERATIONS-CASES.md).
#
# Responsibility: load the backup's settings (/etc/seasonal-cases/backup.env, root only) into this
#                 process, never onto a command line, and run the kit's script, in the copy of its
#                 ops/ folder the installer took out of the game's image. Root only.
# Depends on:     ./lib/common.sh, ./lib/backup.sh, /opt/seasonal-cases/kit/ops, docker
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=deploy/lib/common.sh
. "$HERE/lib/common.sh"
# shellcheck source=deploy/lib/backup.sh
. "$HERE/lib/backup.sh"

[[ $EUID -eq 0 || -n $SC_ROOT ]] || die "run it with sudo"
[[ -r $BACKUP_ENV ]] || die "no backup is set up here ($BACKUP_ENV is missing): run the installer with --backup-recipient"
set -a
# shellcheck source=/dev/null
. "$BACKUP_ENV"
set +a
exec bash "$BACKUP_SCRIPT" "$@"
