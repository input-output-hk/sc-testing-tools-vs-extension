#!/usr/bin/env bash
set -euo pipefail

VOLUME_NAME="pbt-extension-nix-store"

docker volume create "$VOLUME_NAME" >/dev/null

DOCKER_TTY_ARGS=("-i")
if [ -t 0 ] && [ -t 1 ]; then
  DOCKER_TTY_ARGS=("-it")
fi

docker run --rm "${DOCKER_TTY_ARGS[@]}" \
  -v "$VOLUME_NAME:/nix" \
  nixos/nix \
  nix run \
    --accept-flake-config \
    --extra-experimental-features nix-command \
    --extra-experimental-features flakes \
    github:input-output-hk/sc-testing-tools#convex-testing-interface:test:convex-testing-interface-test \
    -- --list-tests-json
