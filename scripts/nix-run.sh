#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/parse-args.sh"
parse_script_args run "$@"

RUN_ARGS=(--streaming-json)
if [ -n "$TEST_IDS" ]; then
  RUN_ARGS+=(--test-id "$TEST_IDS")
fi

if [ -n "$ROUNDS" ]; then
  export TASTY_QUICKCHECK_TESTS="$ROUNDS"
else
  unset TASTY_QUICKCHECK_TESTS
fi

nix run \
  --accept-flake-config \
  --extra-experimental-features nix-command \
  --extra-experimental-features flakes \
  "$PROJECT_PATH#$PACKAGE_NAME:test:$TEST_SUITE_NAME" \
  -- "${RUN_ARGS[@]}"
