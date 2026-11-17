# Attack timeline regression checks

## Build and automated checks

From the extension repository root:

```sh
npm ci
npm run test -w webview-ui
npm run lint -w webview-ui
npm run compile
```

The build includes the extension host, server adapter, webviews and the macOS/Linux server binaries. Bun is supplied by the repository dependencies.

## Native VS Code check

Use VS Code 1.118 or newer. From the extension repository root, with a compatible project in a sibling clone:

```sh
code --new-window \
  --user-data-dir="$PWD/.vscode-test/attack-timeline-user" \
  --extensions-dir="$PWD/.vscode-test/attack-timeline-extensions" \
  --extensionDevelopmentPath="$PWD" \
  "$PWD/../sc-testing-tools-playground"
```

This loads the compiled development extension directly. Opening this repository and selecting **Run Extension** with F5 is another option.

A real backend run requires working Nix or Docker and a compatible test project. In PBT, select NIX mode and Custom rounds 5, refresh `flipped-examples`, run the suite, and open auction **Double Satisfaction → View Results → Transaction Graph → Attack Timeline**. Check both the phase-2 rejection and the validated candidate, then compare Original with After attack.

## Reproduce the audit's backend flow

The audit used playground commit `2439f204d52f8fff3ff17b8e9e32349c32969a6c`. Its `cabal.project` pins backend `ff2089d67c100d3071f9417b59ea44ee03e9370c`; keep the project unmodified.

```sh
git clone https://github.com/input-output-hk/sc-testing-tools-playground.git ../sc-testing-tools-playground
git -C ../sc-testing-tools-playground checkout 2439f204d52f8fff3ff17b8e9e32349c32969a6c
mkdir -p logs/attack-timeline
bash scripts/nix-list.sh --project-path ../sc-testing-tools-playground --package sc-testing-tools-playground --suite flipped-examples > logs/attack-timeline/list.json
bash scripts/nix-run.sh --project-path ../sc-testing-tools-playground --package sc-testing-tools-playground --suite flipped-examples --round 5 > logs/attack-timeline/run.ndjson
```

The flipped suite intentionally fails: its nonzero exit status is expected. Verify that the stream ends with `suite_done`. Auction Double Satisfaction is test ID 2 in this pinned suite.

A fresh run used for this fix emitted 227 schema-valid events with 45 tests, 11 passed and 34 expected failures. Its validated Double Satisfaction candidate had 3 inputs and 4 outputs. On the same parsed trace, the old mapper rendered 2 inputs and 3 outputs; the fixed mapper rendered 3 and 4, with all input labels, types, addresses and values matching the candidate.

This is a new backend execution, not a replay of DQuadrant's historical transaction. Random keys, values and hashes can differ. Native VS Code host/persistence behaviour remains a manual check; backend/parser/mapper checks cover separate boundaries.

Semantic output correspondence and backend provenance are deferred to a later change. This fix compares inputs by unique UTxO reference and withdrawals by unique stake address, while rendering every supplied candidate output without positional pairing.
