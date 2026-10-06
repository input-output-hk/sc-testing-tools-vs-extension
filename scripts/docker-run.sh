#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/parse-args.sh"
parse_script_args run "$@"
VOLUME_NAME="pbt-extension-nix-store"

docker volume create "$VOLUME_NAME" >/dev/null

DOCKER_TTY_ARGS=("-i")
if [ -t 0 ] && [ -t 1 ]; then
  DOCKER_TTY_ARGS=("-it")
fi

docker run --rm "${DOCKER_TTY_ARGS[@]}" \
  -v "$VOLUME_NAME:/nix" \
  -v "$PROJECT_PATH:/project" \
  -e PBT_PACKAGE_NAME="$PACKAGE_NAME" \
  -e PBT_SUITE_NAME="$TEST_SUITE_NAME" \
  -e PBT_TEST_IDS="$TEST_IDS" \
  -e PBT_ROUNDS="$ROUNDS" \
  nixos/nix \
  sh -lc '
    git config --system --add safe.directory "*"
    if [ -n "$PBT_ROUNDS" ]; then
      export TASTY_QUICKCHECK_TESTS="$PBT_ROUNDS"
    else
      unset TASTY_QUICKCHECK_TESTS
    fi
    if [ -n "$PBT_TEST_IDS" ]; then
      nix run \
        --accept-flake-config \
        --extra-experimental-features nix-command \
        --extra-experimental-features flakes \
        "/project#$PBT_PACKAGE_NAME:test:$PBT_SUITE_NAME" \
        -- --streaming-json --test-id "$PBT_TEST_IDS"
    else
      nix run \
        --accept-flake-config \
        --extra-experimental-features nix-command \
        --extra-experimental-features flakes \
        "/project#$PBT_PACKAGE_NAME:test:$PBT_SUITE_NAME" \
          -- --streaming-json
    fi
        '
