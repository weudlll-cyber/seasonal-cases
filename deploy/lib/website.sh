#!/usr/bin/env bash
# @file   deploy/lib/website.sh
# @brief  Website installs: the website's Docker network, the addresses trusted to name a visitor,
#         and the account feed (after seasonal-mini-games ops/lib/website.sh).
#
# Responsibility: the game joins the network of the website's compose project (`seasonal-site`):
#                 the given SC_WEBSITE_NETWORK, else `seasonal-site_default`, else the only network
#                 of the website's proxy container (its Caddy) or site container (behind nginx),
#                 else the operator is asked. Behind Caddy the trusted addresses are that
#                 network's ranges (Caddy keeps working for the game when it is recreated); behind
#                 the host's nginx they are the gateway of the game's own network, where the
#                 published port's connections come from. The account-changes feed is read at
#                 http://site:3800 on that network in both modes, with the games' sync token.
# Depends on:     ./common.sh, docker
# shellcheck shell=bash

SITE_ADDRESS=http://site:3800

# A container of the website's compose project, by service, or empty.
site_container() {
  docker ps -q --filter label=com.docker.compose.project=seasonal-site \
    --filter "label=com.docker.compose.service=$1" 2>/dev/null | head -n 1
}

choose_network() {
  local container=$1 networks
  networks=$(docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' "$container")
  networks=${networks% }
  if [[ -n ${SC_WEBSITE_NETWORK:-} ]]; then
    [[ " $networks " == *" $SC_WEBSITE_NETWORK "* ]] ||
      die "the website's container is not on the network $SC_WEBSITE_NETWORK (it is on: $networks)"
  elif [[ " $networks " == *" seasonal-site_default "* ]]; then
    SC_WEBSITE_NETWORK=seasonal-site_default
  elif [[ -n $networks && $networks != *" "* ]]; then
    SC_WEBSITE_NETWORK=$networks
  else
    ask SC_WEBSITE_NETWORK "the website is on several networks ($networks): which one should the game join?"
  fi
}

network_subnets() {
  docker network inspect -f '{{range .IPAM.Config}}{{.Subnet}} {{end}}' "$1" | xargs | tr ' ' ','
}

# The network, the trusted addresses (unless the operator gave them) and the feed.
website_network() {
  local service=site container
  [[ $SC_PROXY == caddy ]] && service=caddy
  container=$(site_container "$service")
  [[ -n $container ]] || die "the website's $service container (compose project seasonal-site) is not running: start the website first"
  choose_network "$container"
  must_match SC_WEBSITE_NETWORK '^[A-Za-z0-9_.-]+$' "a Docker network name"
  if [[ -z ${SC_TRUSTED_PROXIES:-} ]]; then
    if [[ $SC_PROXY == caddy ]]; then
      SC_TRUSTED_PROXIES=$(network_subnets "$SC_WEBSITE_NETWORK")
      [[ -n $SC_TRUSTED_PROXIES ]] || die "the network $SC_WEBSITE_NETWORK has no subnet to trust"
    else
      SC_TRUSTED_PROXIES=$(gateway_of "$SC_EDGE_SUBNET")
    fi
  fi
  check_addresses
  website_feed
}

# The account-changes feed and the profile card need the games' sync token.
website_feed() {
  local token="$SC_ROOT/etc/seasonal/games-sync-token"
  if [[ -r $token ]]; then
    SC_WEBSITE_LOCAL_ORIGIN=$SITE_ADDRESS
    SC_GAMES_SYNC_TOKEN=$(tr -d '[:space:]' <"$token")
  else
    warn "no account-changes feed: $token is not there (switch Cases on in the website, then run this installer again)"
  fi
}
