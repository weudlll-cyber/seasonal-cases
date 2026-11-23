#!/usr/bin/env bash
# @file   deploy/admin.sh
# @brief  The server's command line on an installed game: `sudo ./deploy/admin.sh admin promote
#         <name>` and `sudo ./deploy/admin.sh admin reset-2fa <name>` (apps/server/src/tools/sc.ts).
#
# Responsibility: load the installed game's settings (/etc/seasonal-cases/cases.env, readable by
#                 root only) into this process, never onto a command line, and run the tool in
#                 the installed code. Root only.
# Depends on:     ./lib/common.sh, node (tsx from the installed code)
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=deploy/lib/common.sh
. "$HERE/lib/common.sh"

[[ $EUID -eq 0 || -n $SC_ROOT ]] || die "run it with sudo"
[[ -r $ENV_FILE ]] || die "no installed game here ($ENV_FILE is missing)"
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a
cd "$APP_DIR/apps/server"
exec node --import=tsx src/tools/sc.ts "$@"
