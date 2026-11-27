#!/usr/bin/env bash
# @file   ops/lib/route.sh
# @brief  Website mode: the game's settings for the kit's route-file step (DECISIONS D83).
#
# Responsibility: the kit's ops/lib/website-route.sh writes the one file in the website's routes
#                 folder (`cases.conf` for nginx, `cases.caddy` for the site's Caddy), checks it
#                 with the proxy, puts the earlier file back when refused and reloads. This names
#                 the game: its slug, base path and secret header, how the proxy reaches the game
#                 and the website (behind nginx on loopback ports, the site's from
#                 /etc/seasonal/site-local-port; behind Caddy by their names on the website's
#                 network), and how to check and reload. The profile card's path
#                 (/games/cases/api/website/) is refused by the server itself for every request
#                 that came through a proxy (apps/server/src/memberSummaryRoutes.ts). An
#                 unchanged file is left, without a reload.
# Depends on:     ./common.sh, ./website.sh (site_container), the kit's ops/lib/website-route.sh,
#                 nginx or docker (the site's Caddy), systemctl
# Used by:        ../install.sh and ../scases (uninstall)
# The SK_ROUTE_* variables are read by the kit's script.
# shellcheck shell=bash disable=SC2034

# Which file, and how the proxy checks and reloads: all an uninstall needs.
route_target() {
  SK_ROUTE_MODE=$SC_PROXY
  if [[ $SC_PROXY == nginx ]]; then
    SK_ROUTE_FILE="$SC_ROUTES_DIR/cases.conf"
    SK_ROUTE_CHECK_CMD='nginx -t -q'
    SK_ROUTE_RELOAD_CMD='systemctl reload nginx'
  else
    local caddy
    caddy=$(site_container caddy)
    SK_ROUTE_FILE="$SC_ROUTES_DIR/cases.caddy"
    SK_ROUTE_CHECK_CMD="docker exec $caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null"
    SK_ROUTE_RELOAD_CMD="docker exec $caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile"
  fi
}

route_upstreams() {
  SK_ROUTE_GAME=cases
  SK_ROUTE_BASE=/games/cases
  SK_ROUTE_SECRET_HEADER=X-Sc-Proxy-Secret
  SK_ROUTE_SECRET=$SC_PROXY_SECRET
  if [[ $SC_PROXY == nginx ]]; then
    local port
    port=$(tr -d '[:space:]' <"$SC_SITE_PORT_FILE")
    [[ $port =~ ^[0-9]{2,5}$ ]] || die "no port in $SC_SITE_PORT_FILE"
    SK_ROUTE_APP="127.0.0.1:$SC_PORT"
    SK_ROUTE_WEBSITE="127.0.0.1:$port"
  else
    [[ -n $(site_container caddy) ]] || die "the website's Caddy container (seasonal-site, caddy) is not running"
    SK_ROUTE_APP=sc-cases:3970
    SK_ROUTE_WEBSITE=site:3800
  fi
}

install_route() {
  step "website route ($SC_PROXY)"
  [[ -d $SC_ROUTES_DIR ]] || die "the website's routes folder $SC_ROUTES_DIR is missing; prepare it with the website's installer first"
  if [[ ! -r $KIT_DIR/ops/lib/website-route.sh ]]; then
    info "would write the route file"
    return 0
  fi
  route_target
  route_upstreams
  # shellcheck source=/dev/null
  . "$KIT_DIR/ops/lib/website-route.sh"
  local new
  new=$("sk_route_$SC_PROXY") || die "the route file could not be made"
  [[ -f $SK_ROUTE_FILE && $(<"$SK_ROUTE_FILE") == "$new" ]] && return 0
  CHANGES=$((CHANGES + 1))
  if ((DRY_RUN)); then
    info "would write $SK_ROUTE_FILE and reload the proxy"
    return 0
  fi
  sk_route_install || die "the website's proxy did not take the route (see above)"
}

# Whether visitors reach the game through the website.
check_through_website() {
  local url="$SC_WEBSITE_ORIGIN/games/cases/readyz"
  ((DRY_RUN)) && return 0
  if curl -fsS --max-time 10 -o /dev/null "$url"; then
    info "ready through the website: $url"
  else
    warn "the game does not answer ready through the website ($url); check the website's proxy"
  fi
}
