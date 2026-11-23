#!/usr/bin/env bash
# @file   deploy/lib/route.sh
# @brief  Website mode: the game's route file in the website's routes folder, checked before a
#         reload, the previous file restored when the check fails.
#
# Responsibility: the website's docs/DEPLOYMENT.md "Embedded games" and GAME-INTEGRATION §2–§7,
#                 in the shape of seasonal-mini-games ops/lib/website-route.sh. One file,
#                 `cases.conf` (nginx, /etc/seasonal/routes, the site port from
#                 /etc/seasonal/site-local-port) or `cases.caddy` (the site's Caddy in its
#                 container, /etc/caddy/routes on the host checkout), mode 0600: it holds the
#                 proxy secret. In it: /games/cases → /games/cases/; the profile card's path
#                 (/games/cases/api/website/) answers 404 publicly (§7); every request has its
#                 identity headers and the secret cleared and the website's session cookie
#                 removed; only the sign-in route asks the website's authorize route and passes
#                 its answer on, then adds the secret; everything else goes to the game. The
#                 account-changes feed is denied by the website's own files. The Caddy file names
#                 the range the game trusts to name the visitor (SC_TRUSTED_PROXIES, D37). It
#                 never touches a website-owned file.
# Depends on:     ./common.sh, nginx or docker (the site's Caddy), systemctl
# shellcheck shell=bash

BASE=/games/cases
SIGN_IN_ROUTE=$BASE/auth/website
AUTHORIZE_PATH=/api/games/cases/authorize
SECRET_HEADER=X-Sc-Proxy-Secret
IDENTITY_HEADERS=(X-Acting-User-Id X-Acting-User X-Acting-User-Roles X-Acting-User-Email-Verified
  X-Acting-User-Can-Host X-Acting-User-Steps X-Acting-Guest)

route_file() {
  if [[ $SC_PROXY == nginx ]]; then printf '%s/cases.conf' "$SC_ROUTES_DIR"; else printf '%s/cases.caddy' "$SC_ROUTES_DIR"; fi
}

render_nginx() {
  local game=$1 site=$2 h clear='' set=''
  for h in "${IDENTITY_HEADERS[@]}" "$SECRET_HEADER"; do clear+="    proxy_set_header $h \"\";"$'\n'; done
  for h in "${IDENTITY_HEADERS[@]}"; do
    local v="sc_${h//-/_}"
    v=${v,,}
    set+="    auth_request_set \$$v \$upstream_http_${h//-/_};"$'\n'
    set+="    proxy_set_header $h \$$v;"$'\n'
  done
  set=${set,,}
  # The website's session cookie (__Host-se.sid, se.sid) never reaches the game: removed up to
  # three times from the Cookie header the game gets (GAME-INTEGRATION §3).
  local strip='    if ($sc_cookie ~ "^(.*?)(?:^|;\s*)(?:__Host-)?se\.sid=[^;]*(.*)$") { set $sc_cookie $1$2; }'
  local nl=$'\n' cookie
  cookie="    set \$sc_cookie \$http_cookie;$nl$strip$nl$strip$nl$strip$nl"
  cookie+="    proxy_set_header Cookie \$sc_cookie;$nl"
  cat <<NGINX
# Seasonal Cases: written by deploy/install.sh of the game; do not edit by hand.
location = $BASE { return 308 $BASE/; }
location ^~ $BASE/api/website/ { return 404; }
location ^~ $BASE/ {
${clear}${cookie}    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$http_connection;
    proxy_pass http://$game;
}
location = $SIGN_IN_ROUTE {
${cookie}    auth_request /_sc_cases_authorize;
${set}    # Added after the authorize call, which never carries it.
    proxy_set_header $SECRET_HEADER "$SC_PROXY_SECRET";
    error_page 401 403 = @sc_cases_login;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_pass http://$game;
}
location = /_sc_cases_authorize {
    internal;
    proxy_pass http://$site$AUTHORIZE_PATH;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header $SECRET_HEADER "";
    proxy_set_header Host \$host;
    proxy_set_header X-Original-Method \$request_method;
    proxy_set_header X-Original-URI \$request_uri;
}
location @sc_cases_login { return 302 $SIGN_IN_ROUTE/login\$is_args\$args; }
NGINX
}

render_caddy() {
  local game=$1 site=$2 h clear=''
  for h in "${IDENTITY_HEADERS[@]}" "$SECRET_HEADER"; do clear+=$'\t\t'"request_header -$h"$'\n'; done
  cat <<CADDY
# Seasonal Cases: written by deploy/install.sh of the game; do not edit by hand.
# The game trusts X-Forwarded-For from $SC_TRUSTED_PROXIES (the installer's answer, SC_TRUSTED_PROXIES).
redir $BASE $BASE/ 308
handle $BASE/* {
	route {
		@sc_card path $BASE/api/website/*
		respond @sc_card 404
${clear}		@sc_signin path $SIGN_IN_ROUTE
		forward_auth @sc_signin $site {
			uri $AUTHORIZE_PATH
			header_up X-Original-Method {http.request.method}
			header_up X-Original-URI {http.request.uri}
			copy_headers ${IDENTITY_HEADERS[*]}
			@sc_refused status 401 403
			handle_response @sc_refused {
				redir * $SIGN_IN_ROUTE/login?{query} 302
			}
		}
		request_header @sc_signin $SECRET_HEADER $SC_PROXY_SECRET
		request_header Cookie \`(^|;\\s*)(__Host-)?se\\.sid=[^;]*\` ""
		request_header Cookie \`^;\\s*\` ""
		@sc_no_cookie header_regexp Cookie \`^\\s*\$\`
		request_header @sc_no_cookie -Cookie
		reverse_proxy $game
	}
}
CADDY
}

# The site's Caddy container (compose project seasonal-site, service caddy), or empty.
site_caddy() {
  docker ps -q --filter label=com.docker.compose.project=seasonal-site \
    --filter label=com.docker.compose.service=caddy 2>/dev/null | head -n 1
}

check_proxy() {
  if [[ $SC_PROXY == nginx ]]; then
    nginx -t -q
  else
    docker exec "$(site_caddy)" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
  fi
}

reload_proxy() {
  if [[ $SC_PROXY == nginx ]]; then
    run systemctl reload nginx
  else
    run docker exec "$(site_caddy)" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
  fi
}

install_route() {
  step "website route ($SC_PROXY)"
  [[ -d $SC_ROUTES_DIR ]] || die "the website's routes folder $SC_ROUTES_DIR is missing; prepare it with the website's installer first"
  local file old game site
  file=$(route_file)
  game="$SC_HOST:$SC_PORT"
  if [[ $SC_PROXY == nginx ]]; then
    site="127.0.0.1:$(tr -d '[:space:]' <"$SC_SITE_PORT_FILE")"
    [[ $site =~ ^127\.0\.0\.1:[0-9]{2,5}$ ]] || die "no port in $SC_SITE_PORT_FILE"
  else
    [[ -n $(site_caddy) ]] || die "the website's Caddy container (seasonal-site, caddy) is not running"
    site=site:3800
  fi
  old=$(mktemp)
  [[ -f $file ]] && cp -p "$file" "$old"
  local before=$CHANGES
  if [[ $SC_PROXY == nginx ]]; then render_nginx "$game" "$site"; else render_caddy "$game" "$site"; fi | put_file "$file" 0600
  if ((CHANGES == before)) || ((DRY_RUN)); then
    rm -f "$old"
    return 0
  fi
  if ! check_proxy; then
    if [[ -s $old ]]; then cp -p "$old" "$file"; else rm -f "$file"; fi
    rm -f "$old"
    die "the website's proxy refused the new route; the earlier state is back, nothing was reloaded"
  fi
  rm -f "$old"
  reload_proxy
  info "the website's proxy reloaded"
}
