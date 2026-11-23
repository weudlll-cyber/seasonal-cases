#!/usr/bin/env bash
# @file   deploy/lib/common.sh
# @brief  The installer's shared parts: messages, questions, remembered answers, files, secrets.
#
# Responsibility: after seasonal-mini-games ops/lib/common.sh and config.sh. Every path hangs off
#                 SC_ROOT (empty on a real server; a temporary folder in deploy/test), so the
#                 tests run without root. `ask` keeps a value already given (flag, answers file,
#                 the remembered state) and with --yes stops on a missing answer that has no
#                 default. `put_file` writes atomically and only on change, counting changes;
#                 under --check (DRY_RUN) it only says what it would write. Values are kept as
#                 KEY='value' lines and read back by parsing, never by sourcing. Secrets are
#                 never printed.
# Depends on:     bash 4+, coreutils, openssl or /dev/urandom
# shellcheck shell=bash

# `... | put_file` runs put_file in this shell, so its change count stays (scripts have no job
# control, which lastpipe needs off).
shopt -s lastpipe

SC_ROOT="${SC_ROOT:-}"
ETC_DIR="$SC_ROOT/etc/seasonal-cases"
STATE_FILE="$ETC_DIR/install.conf"
ENV_FILE="$ETC_DIR/cases.env"
OPT_DIR="$SC_ROOT/opt/seasonal-cases"
APP_DIR="$OPT_DIR/app"
UNIT_FILE="$SC_ROOT/etc/systemd/system/seasonal-cases.service"
SERVICE=seasonal-cases
SERVICE_USER=seasonal-cases
DRY_RUN=0
YES=0
CHANGES=0

info() { printf '  %s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
die() {
  printf 'STOP: %s\n' "$*" >&2
  exit 1
}

# Runs a command, or under --check only says it would.
run() {
  if ((DRY_RUN)); then
    printf '  would run: %s\n' "$*"
  else
    "$@"
  fi
}

# A random secret of $1 bytes as hex.
secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    od -An -tx1 -N"$1" /dev/urandom | tr -d ' \n'
  fi
}

# The value of KEY in a KEY='value' file, or empty.
file_value() {
  local file=$1 key=$2 line
  [[ -r $file ]] || return 0
  while IFS= read -r line; do
    if [[ $line == "$key="* ]]; then
      line=${line#"$key="}
      # KEY='value' (ours), KEY="value" (os-release) or KEY=value.
      line=${line#[\'\"]}
      printf '%s' "${line%[\'\"]}"
      return 0
    fi
  done <"$file"
}

# Loads KEY='value' lines of a file into the variables named in $2..; set ones are kept.
load_values() {
  local file=$1 key value
  shift
  [[ -r $file ]] || return 0
  for key in "$@"; do
    [[ -n ${!key:-} ]] && continue
    value=$(file_value "$file" "$key")
    [[ -n $value ]] && printf -v "$key" '%s' "$value"
  done
  return 0
}

# One KEY='value' line; a value with a quote or a line break is refused.
quoted() {
  local key=$1 value=$2
  [[ $value != *"'"* && $value != *$'\n'* ]] || die "the value of $key may not hold a quote or a line break"
  printf "%s='%s'\n" "$key" "$value"
}

# ask VAR "question" [default]: keeps a given value; --yes takes the default or stops.
ask() {
  local var=$1 question=$2 default=${3:-} answer
  [[ -n ${!var:-} ]] && return 0
  if ((YES)); then
    [[ -n $default ]] || die "missing answer for: $var ($question); pass it as a flag or in --answers"
    printf -v "$var" '%s' "$default"
    return 0
  fi
  read -r -p "  $question${default:+ [$default]}: " answer
  printf -v "$var" '%s' "${answer:-$default}"
  [[ -n ${!var} ]] || die "no answer for: $question"
}

# Like ask, without echo: for a value that holds a password; never a default.
ask_secret() {
  local var=$1 question=$2 answer
  [[ -n ${!var:-} ]] && return 0
  ((YES)) && die "missing answer for: $var ($question); give it in --answers, never as a flag"
  read -r -s -p "  $question: " answer
  echo
  printf -v "$var" '%s' "$answer"
  [[ -n ${!var} ]] || die "no answer for: $question"
}

# put_file PATH MODE: the content comes on stdin; written atomically and only when it changed.
put_file() {
  local path=$1 mode=$2 tmp
  tmp=$(mktemp)
  cat >"$tmp"
  if [[ -f $path ]] && cmp -s "$tmp" "$path"; then
    rm -f "$tmp"
    return 0
  fi
  CHANGES=$((CHANGES + 1))
  if ((DRY_RUN)); then
    printf '  would write %s (%s lines, mode %s)\n' "${path#"$SC_ROOT"}" "$(wc -l <"$tmp")" "$mode"
    rm -f "$tmp"
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  chmod "$mode" "$tmp"
  mv "$tmp" "$path"
  info "wrote ${path#"$SC_ROOT"}"
}

# Checks an answer against a pattern; the message names the variable, never the value.
must_match() {
  local var=$1 pattern=$2 what=$3
  [[ ${!var} =~ $pattern ]] || die "$var must be $what"
}
