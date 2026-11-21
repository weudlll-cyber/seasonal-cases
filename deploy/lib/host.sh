#!/usr/bin/env bash
# @file   deploy/lib/host.sh
# @brief  The machine: Debian or Ubuntu, the packages, Node and pnpm, PostgreSQL when asked for.
#
# Responsibility: refuse another system; add only missing packages; Node 22 from NodeSource's own
#                 signed apt repository, the way the website's installer adds Docker (its
#                 deploy/install/lib/packages.sh: the vendor's key under /etc/apt/keyrings);
#                 pnpm through corepack at the version package.json pins; with SC_DB=create a
#                 local PostgreSQL with its own role and database, the password generated once
#                 and kept in the environment file only.
# Depends on:     ./common.sh, apt-get, curl, gpg, systemctl, runuser (psql)
# shellcheck shell=bash

NODE_MAJOR=22

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
  apt_install ca-certificates curl git gnupg openssl
}

install_node() {
  local version=''
  version=$(node --version 2>/dev/null || true)
  if [[ $version =~ ^v([0-9]+)\. ]] && ((BASH_REMATCH[1] >= NODE_MAJOR)); then
    info "Node $version"
  else
    info "adding NodeSource's repository for Node $NODE_MAJOR"
    run mkdir -p "$SC_ROOT/etc/apt/keyrings"
    run curl -fsSL -o "$SC_ROOT/etc/apt/keyrings/nodesource.asc" \
      https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key
    printf 'deb [signed-by=/etc/apt/keyrings/nodesource.asc] https://deb.nodesource.com/node_%s.x nodistro main\n' \
      "$NODE_MAJOR" | put_file "$SC_ROOT/etc/apt/sources.list.d/nodesource.list" 0644
    run apt-get update -q
    run env DEBIAN_FRONTEND=noninteractive apt-get install -y -q nodejs
  fi
  run corepack enable
}

# The PostgreSQL role and database, created when missing; answers nothing, sets DATABASE_URL.
ensure_database() {
  [[ $SC_DB == create ]] || return 0
  step "PostgreSQL"
  apt_install postgresql
  run systemctl enable --now postgresql
  local password
  password=$(file_value "$ENV_FILE" SC_DB_PASSWORD)
  [[ -n $password ]] || password=$(secret 24)
  SC_DB_PASSWORD=$password
  DATABASE_URL="postgres://seasonal_cases:$password@127.0.0.1:5432/seasonal_cases"
  if run runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'seasonal_cases'" | grep -qx 1; then
    info "role seasonal_cases exists"
  else
    # The password reaches psql on its standard input, never in a process list.
    printf "CREATE ROLE seasonal_cases LOGIN PASSWORD '%s';\n" "$password" |
      run runuser -u postgres -- psql -q -v ON_ERROR_STOP=1
    info "role seasonal_cases created"
  fi
  if run runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'seasonal_cases'" | grep -qx 1; then
    info "database seasonal_cases exists"
  else
    run runuser -u postgres -- createdb -O seasonal_cases seasonal_cases
    info "database seasonal_cases created"
  fi
}
