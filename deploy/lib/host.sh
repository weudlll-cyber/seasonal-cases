#!/usr/bin/env bash
# @file   deploy/lib/host.sh
# @brief  The machine: Debian or Ubuntu, the few packages the installer needs, and Docker.
#
# Responsibility: refuse another system; add only missing packages (certificates, curl, git,
#                 openssl; ./backup.sh adds age); check that Docker with its compose plugin is there
#                 and say how to install it otherwise. Node, pnpm and PostgreSQL run in containers.
# Depends on:     ./common.sh, apt-get, dpkg, docker
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
