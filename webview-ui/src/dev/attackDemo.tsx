import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TestResultView from '../webview/testResult';
import { createSyntheticAttackRound } from '../webview/testResult/fixtures/syntheticAttack';
import type { WebviewApi } from 'vscode-webview';
import '../style.css';

const round = createSyntheticAttackRound();
const rejected = structuredClone(round.traces[0]);
rejected.modifiedTx!.inputs = [rejected.tx.inputs[1]];
rejected.modifiedTx!.id = 'synthetic-rejected-candidate';
rejected.modifiedTx!.outputs = rejected.modifiedTx!.outputs.slice(1).map((output, index) => ({ ...output, utxo: `synthetic-rejected-candidate#${index}` }));
rejected.modifiedTx!.withdrawals = [{ stakeAddress: 'synthetic-stake', addressType: 'script', amount: 0 }];
rejected.validation = { status: 'phase2_invalid', errors: ['Controlled phase 2 rejection for the local demo.'] };
rejected.outcome = { status: 'passed' };
const unavailable = structuredClone(rejected);
unavailable.modifiedTx = undefined;
unavailable.validation = { status: 'rebalance_failed', reason: 'Controlled unavailable candidate.' };
unavailable.outcome = { status: 'skipped_phase1', reason: 'Synthetic skipped attempt.' };
round.traces.push(rejected, unavailable);
const test: Test = {
  id: round.testId, name: 'Synthetic attack regression demo', group: [], type: 'threat-model', status: 'invalid',
  isBuilding: false, isWaiting: false, isRunning: false, isStatic: false, hasCoverage: false,
  failureMessage: 'Controlled fixture: 2 inputs / 3 outputs become 3 inputs / 4 outputs. This is not the historical DQuadrant run.',
};
const vscode: WebviewApi<unknown> = {
  getState: () => undefined,
  setState: state => state,
  postMessage: message => {
    if ((message as WebviewToExtensionMessage).type === 'webview-ready') queueMicrotask(() => window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'test-result', payload: { test, rounds: [round] } },
    })));
  },
};
createRoot(document.getElementById('root')!).render(<StrictMode><TestResultView vscode={vscode} /></StrictMode>);
