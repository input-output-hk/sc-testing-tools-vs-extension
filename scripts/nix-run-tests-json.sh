#!/usr/bin/env bash
set -euo pipefail

PROJECT_PATH=$1
PACKAGE_NAME=$2
TEST_SUITE_NAME=$3
TEST_IDS=$4

nix run \
  --accept-flake-config \
  --extra-experimental-features nix-command \
  --extra-experimental-features flakes \
  $PROJECT_PATH#$PACKAGE_NAME:test:$TEST_SUITE_NAME \
  -- --streaming-json --test-id $TEST_IDS
