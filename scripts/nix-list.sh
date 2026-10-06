#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/parse-args.sh"
parse_script_args list "$@"

nix run \
  --accept-flake-config \
  --extra-experimental-features nix-command \
  --extra-experimental-features flakes \
  "$PROJECT_PATH#$PACKAGE_NAME:test:$TEST_SUITE_NAME" \
  -- --list-tests-json