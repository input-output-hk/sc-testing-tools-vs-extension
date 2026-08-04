#!/usr/bin/env bash
set -euo pipefail

PROJECT_PATH=$1
PACKAGE_NAME=$2
TEST_SUITE_NAME=$3
VOLUME_NAME="pbt-extension-nix-store"

docker volume create "$VOLUME_NAME" >/dev/null

DOCKER_TTY_ARGS=("-i")
if [ -t 0 ] && [ -t 1 ]; then
  DOCKER_TTY_ARGS=("-it")
fi

docker run --rm "${DOCKER_TTY_ARGS[@]}" \
  -v "$VOLUME_NAME:/nix" \
  -v "$PROJECT_PATH:/project" \
  nixos/nix \
  sh -lc '
    git config --system --add safe.directory "*"
    nix run \
      --accept-flake-config \
      --extra-experimental-features nix-command \
      --extra-experimental-features flakes \
      /project#$1:test:$2 \
      -- --list-tests-json
  ' _ "$PACKAGE_NAME" "$TEST_SUITE_NAME"
