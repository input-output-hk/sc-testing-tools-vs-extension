import { ChildProcess } from 'node:child_process';
import { expect, it } from 'vitest';
import { parseTestEvent } from '../../server/utils/parseTestEvent';
import { mapTestRoundToGraphData } from '../src/webview/testResult/utils/reactFlowUtils';
import { createSyntheticAttackRound } from '../src/webview/testResult/fixtures/syntheticAttack';
import type { TxSummary, SCToolsStreamingEvent } from '../../server/schemas/streaming-events';

it('preserves a schema-valid event through the real parser into the candidate graph', () => {
  const trace = createSyntheticAttackRound().traces[0];
  const toSummary = (tx: Tx): TxSummary => ({
    ...tx, id: tx.id ?? null, signers: tx.signers ?? [], mint: tx.mint ?? null, validRange: null,
    inputs: tx.inputs.map(input => ({ ...input, addressLabel: input.addressLabel ?? null,
      redeemerConstr: 0, redeemerKind: null, redeemerPayload: null, redeemerRaw: null })),
    outputs: tx.outputs.map(output => ({ ...output, addressLabel: output.addressLabel ?? null, datum: output.datum ?? null })),
    withdrawals: [],
  });
  const parsed: SCToolsStreamingEvent = { event: 'test_trace', id: 1, category: 'positive', covered: [],
    trace: { index: 0, status: { status: 'success' }, transitions: [], threatModels: [{
      name: 'Synthetic insertion at head', testId: 2, covered: [], category: 'claimed',
      originalTx: toSummary(trace.tx), modifiedTx: toSummary(trace.modifiedTx!),
      modifications: [], targetTxIndex: 0, outcome: trace.outcome, validation: trace.validation!,
    }] } };
  const event = parseTestEvent('synthetic-run', 'synthetic', 'demo', 'controlled-fixture', false,
    { child: new ChildProcess(), rawOutput: JSON.stringify(parsed), parsed });
  expect(event?.eventType).toBe('test-context');
  if (event?.eventType !== 'test-context') throw new Error('Expected parsed context');
  const round = (event as TestContextEvent).payload.rounds.find(r => r.type === 'threat-model') as ThreatModelTestRound;
  expect([round.traces[0].tx.inputs.length, round.traces[0].modifiedTx!.inputs.length]).toEqual([2, 3]);
  const graph = mapTestRoundToGraphData('attack-timeline', round, 0);
  expect([graph.nodes.length, graph.edges.length, graph.transactions[0].data.id.current]).toEqual([8, 7, 'synthetic-candidate']);
});
