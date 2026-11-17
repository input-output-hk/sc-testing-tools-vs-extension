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

## Controlled browser demo

```sh
npm run demo -w webview-ui
```

Open <http://127.0.0.1:5173/webview-ui/entrypoint/attack-demo.html>, then **Transaction Graph → Attack Timeline**. The page uses the actual result components and React Flow with a local webview-message adapter. Its data is a synthetic regression fixture, not the historical DQuadrant trace. The demo is not included in the production build entrypoints.

1. Attempt 1, After attack: 3 inputs, 4 outputs, 1 transaction, 7 edges and 7 transaction ports. The wallet remains `wallet#0`; the added script is `added#0`.
2. Original: 2 inputs, 3 outputs and 5 edges. Switch repeatedly between snapshots. Candidate outputs must have no inferred previous values.
3. Open Graph Explorer with the map icon, select the transaction and check that it is centred.
4. Attempt 2: 1 input, 3 outputs and a withdrawal of zero. Candidate validation is `phase2_invalid`, while the property outcome is `passed`.
5. Attempt 3: the candidate is unavailable; Original remains accessible, After attack is disabled and the skip reason is shown.
6. In Test Rounds, expand the round and click an original UTxO. The link must open Result Graph and focus the original node.
7. Check View details, copied values, keyboard operation of the attempt/snapshot controls and the empty-round state.

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

This is a new backend execution, not a replay of DQuadrant's historical transaction. Random keys, values and hashes can differ. Native VS Code host/persistence behaviour remains a manual check; the browser smoke and backend/parser/mapper checks cover separate boundaries.

Semantic output correspondence and backend provenance are deferred to a later change. This fix compares inputs by unique UTxO reference and withdrawals by unique stake address, while rendering every supplied candidate output without positional pairing.
