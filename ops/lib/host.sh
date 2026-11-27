#!/usr/bin/env bash
# @file   ops/lib/host.sh
# @brief  The machine: Debian or Ubuntu, the few packages the installer needs, Docker, the
#         operator's contact address and the server's basic security.
#
# Responsibility: refuse another system; add only missing packages (certificates, curl, git,
#                 openssl; ./backup-settings.sh adds age); check that Docker with its compose
#                 plugin is there and say how to install it otherwise. Node, pnpm and PostgreSQL
#                 run in containers. The operator's contact address (the kit's sk_operator_email,
#                 kept in /etc/seasonal/operator.env for every Seasonal installer) is what the
#                 privacy page names; without one it says "the operator of this site". The
#                 server's firewall, security updates and fail2ban are the kit's
#                 sk_host_baseline (standalone only; inside the website the website's installer
#                 owns the host).
# Depends on:     ./common.sh, the kit's ops/lib/operator.sh and host-baseline.sh, apt-get, dpkg,
#                 docker
# shellcheck shell=bash

check_os() {
  local id='' like=''
  [[ -r $SC_ROOT/etc/os-release ]] || die "no /etc/os-release: this installer needs Debian or Ubuntu"
  id=$(file_value "$SC_ROOT/etc/os-release" ID)
  like=$(file_value "$SC_ROOT/etc/os-release" ID_LIKE)
  [[ $id == debian || $id == ubuntu || $like == *debian* ]] || die "this installer needs Debian or Ubuntu (found $id)"
  info "system: $id"
}

apt_install() {
  local missing=() pkg
  for pkg in "$@"; do
    dpkg -s "$pkg" >/dev/null 2>&1 || missing+=("$pkg")
  done
  ((${#missing[@]} == 0)) && return 0
  info "installing ${missing[*]}"
  run apt-get update -q
  run env DEBIAN_FRONTEND=noninteractive apt-get install -y -q --no-upgrade "${missing[@]}"
}

install_prereqs() {
  step "packages"
  apt_install ca-certificates curl git openssl
}

# Docker with its compose plugin runs the game (DECISIONS D76). The installer does not install it:
# it says how, so the operator decides which packages the server runs.
check_docker() {
  step "docker"
  if ! command -v docker >/dev/null 2>&1 || ! docker version >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
    die "Docker with its compose plugin is needed and not there. On Ubuntu or Debian: sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 (or Docker's own packages: https://docs.docker.com/engine/install/). Then run this installer again."
  fi
  info "Docker with compose is there"
}

# SC_PRIVACY_CONTACT from the operator's address: --email, the server's file, or a question.
operator_contact() {
  step "operator address"
  if [[ ! -r $KIT_DIR/ops/lib/operator.sh ]]; then
    info "would ask for the operator's contact address"
    return 0
  fi
  # shellcheck source=/dev/null
  . "$KIT_DIR/ops/lib/operator.sh"
  local known
  known=$(sk_operator_read) || die "the operator's address could not be read"
  if ((DRY_RUN)); then
    SC_PRIVACY_CONTACT=${EMAIL:-$known}
    return 0
  fi
  if [[ -z $EMAIL && -z $known ]] && ((YES)); then
    warn "no operator address: the privacy page names \"the operator of this site\" (pass --email)"
    return 0
  fi
  SC_PRIVACY_CONTACT=$(sk_operator_email "$EMAIL") || die "no operator address (see above)"
}

host_baseline() {
  step "server security"
  if ((DRY_RUN)) || [[ ! -r $KIT_DIR/ops/lib/host-baseline.sh ]]; then
    info "would set up the server's firewall, security updates and fail2ban (standalone only)"
    return 0
  fi
  # shellcheck source=/dev/null
  . "$KIT_DIR/ops/lib/host-baseline.sh"
  local kind=standalone
  [[ $SC_INSTALL_MODE == website ]] && kind=website
  sk_host_baseline "$kind" || die "the server's security could not be set up (see above)"
}

