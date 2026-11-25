#!/usr/bin/env bash
# @file   deploy/admin.sh
# @brief  The server's command line on an installed game: `sudo ./deploy/admin.sh admin promote
#         <name>` and `sudo ./deploy/admin.sh admin reset-2fa <name>` (apps/server/src/tools/sc.ts).
#
# Responsibility: run the tool inside the running game's container, which has the database and the
#                 settings; nothing secret passes through this command line. Root only (Docker).
# Depends on:     ./lib/common.sh, docker compose, the running stack
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=deploy/lib/common.sh
. "$HERE/lib/common.sh"

[[ $EUID -eq 0 || -n $SC_ROOT ]] || die "run it with sudo"
[[ -r $ENV_FILE ]] || die "no installed game here ($ENV_FILE is missing)"
flags=()
[[ -t 0 ]] || flags=(-T)
exec docker compose -p "$PROJECT" exec "${flags[@]}" app node --import=tsx src/tools/sc.ts "$@"
