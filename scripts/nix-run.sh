#!/usr/bin/env bash
set -euo pipefail

PROJECT_PATH=$1
PACKAGE_NAME=$2
TEST_SUITE_NAME=$3
ROUNDS=$4
TEST_IDS="${5:-}"

# Removing quickcheck tests parameter until it's supported
# RUN_ARGS=(--streaming-json --quickcheck-tests "$ROUNDS")

RUN_ARGS=(--streaming-json)
if [ -n "$TEST_IDS" ]; then
  RUN_ARGS+=(--test-id "$TEST_IDS")
fi

nix run \
  --accept-flake-config \
  --extra-experimental-features nix-command \
  --extra-experimental-features flakes \
  "$PROJECT_PATH#$PACKAGE_NAME:test:$TEST_SUITE_NAME" \
  -- "${RUN_ARGS[@]}"
