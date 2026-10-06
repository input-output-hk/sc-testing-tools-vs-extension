#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/parse-args.sh"
parse_script_args list "$@"
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
  nixos/nix \
  sh -lc '
    git config --system --add safe.directory "*"
    nix run \
      --accept-flake-config \
      --extra-experimental-features nix-command \
      --extra-experimental-features flakes \
        "/project#$PBT_PACKAGE_NAME:test:$PBT_SUITE_NAME" \
      -- --list-tests-json
      '
