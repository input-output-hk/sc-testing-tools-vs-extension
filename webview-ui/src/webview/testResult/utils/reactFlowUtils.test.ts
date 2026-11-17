import { expect, it } from 'vitest';
import { mapTestRoundToGraphData } from './reactFlowUtils';
import { createSyntheticAttackRound } from '../fixtures/syntheticAttack';

it('shows every candidate input and output after an insertion at the start', () => {
  const graph = mapTestRoundToGraphData('attack-timeline', createSyntheticAttackRound(), 0);
  const tx = graph.nodes.find(n => n.type === 'tx')!.data as GraphNodeTx;
  expect([tx.inputCount, tx.outputCount, graph.nodes.length, graph.edges.length]).toEqual([3, 4, 8, 7]);
  const wallet = graph.nodes.find(n => n.data.label === 'Synthetic wallet')!.data as GraphNodeUTxO;
  expect([wallet.type, wallet.utxo?.current, wallet.address?.current]).toEqual(['wallet', 'wallet#0', 'address-wallet#0']);
});

const txNode = (graph: ReturnType<typeof mapTestRoundToGraphData>) => graph.transactions[0].data;

it('keeps original and candidate snapshots separate and targets existing explorer nodes', () => {
  const round = createSyntheticAttackRound();
  const original = mapTestRoundToGraphData('attack-timeline', round, 0, 'original');
  const candidate = mapTestRoundToGraphData('attack-timeline', round, 0);
  expect([txNode(original).id.current, txNode(original).inputCount, txNode(original).outputCount]).toEqual(['synthetic-original', 2, 3]);
  expect(txNode(candidate).id.current).toBe('synthetic-candidate');
  expect(original.transactions[0].nodeId).not.toBe(candidate.transactions[0].nodeId);
  expect(candidate.nodes.some(n => n.id === candidate.transactions[0].nodeId)).toBe(true);
});

it('matches reordered inputs by UTxO and takes every current field from the candidate', () => {
  const round = createSyntheticAttackRound();
  const trace = round.traces[0];
  trace.modifiedTx!.inputs = [trace.tx.inputs[1], { ...trace.tx.inputs[0], addressType: 'public-key', addressLabel: 'Changed', address: 'changed-address', value: { lovelace: 0, assets: [] } }];
  const graph = mapTestRoundToGraphData('attack-timeline', round, 0);
  const changed = graph.nodes.find(n => n.data.label === 'Changed')!.data as GraphNodeUTxO;
  expect([changed.type, changed.address?.current, changed.address?.previous, changed.utxo?.current, changed.utxo?.previous]).toEqual(['wallet', 'changed-address', 'address-script#0', 'script#0', 'script#0']);
  expect(changed.value?.current.lovelace).toBe(0);
});

it('omits removed elements and never pairs candidate outputs by index', () => {
  const round = createSyntheticAttackRound();
  round.traces[0].modifiedTx!.inputs = [];
  round.traces[0].modifiedTx!.outputs = [round.traces[0].modifiedTx!.outputs[3]];
  const graph = mapTestRoundToGraphData('attack-timeline', round, 0);
  expect([graph.nodes.length, graph.edges.length, txNode(graph).inputCount, txNode(graph).outputCount]).toEqual([2, 1, 0, 1]);
  const output = graph.nodes.find(n => n.type !== 'tx')!.data as GraphNodeUTxO;
  expect(output.utxo?.current).toBe('synthetic-candidate#3');
  expect(output.value?.comparisonAvailable).not.toBe(true);
  expect(output.value?.previous).toBeUndefined();
});

it('does not replay modifications over the supplied candidate', () => {
  const round = createSyntheticAttackRound();
  round.traces[0].modifications = [{ type: 'removeRequiredSigner', keyHash: 'signer-b' }, { type: 'removeRequiredSigner', keyHash: 'signer-a' }, { type: 'replaceTx' }];
  expect(txNode(mapTestRoundToGraphData('attack-timeline', round, 0)).signers.current).toEqual(['signer-b']);
});

it('shows current withdrawals, matches them by stake address, and includes them in focus and ports', () => {
  const round = createSyntheticAttackRound();
  round.traces[0].tx.withdrawals = [{ stakeAddress: 'stake-a', addressType: 'script', amount: 5 }];
  round.traces[0].modifiedTx!.withdrawals = [{ stakeAddress: 'stake-b', addressType: 'script', amount: 20 }, { stakeAddress: 'stake-a', addressType: 'script', amount: 0 }];
  const graph = mapTestRoundToGraphData('attack-timeline', round, 0);
  const withdrawal = graph.nodes.find(n => n.data.stakeAddress && (n.data as GraphNodeUTxO).stakeAddress?.current === 'stake-a')!;
  expect((withdrawal.data as GraphNodeUTxO).amount).toEqual({ current: 0, previous: 5, comparisonAvailable: true });
  expect(txNode(graph).withdrawalCount).toBe(2);
  expect(graph.stepNodes).toContain(withdrawal.id);
  expect(graph.edges.length).toBe(9);
});

it.each([
  ['valid', 'success'], ['phase1_invalid', 'failure'], ['phase2_invalid', 'failure'], ['rebalance_failed', 'not-evaluated'], [undefined, 'unknown'],
] as const)('shows validation %s independently of property outcome', (status, expected) => {
  const round = createSyntheticAttackRound();
  round.traces[0].outcome = { status: 'passed' };
  round.traces[0].validation = status === undefined ? undefined : status === 'valid' ? { status } : status === 'rebalance_failed' ? { status, reason: 'controlled reason' } : { status, errors: ['controlled rejection'] };
  expect(txNode(mapTestRoundToGraphData('attack-timeline', round, 0)).status).toBe(expected);
});

it('falls back to a neutral original without a candidate and renders no manufactured changes', () => {
  const round = createSyntheticAttackRound();
  round.traces[0].modifiedTx = undefined;
  round.traces[0].validation = undefined;
  round.traces[0].modifications = [{ type: 'removeInput', utxo: 'wallet#0' }];
  const graph = mapTestRoundToGraphData('attack-timeline', round, 0);
  expect([txNode(graph).id.current, txNode(graph).inputCount, txNode(graph).status]).toEqual(['synthetic-original', 2, 'unknown']);
});

it('isolates attempts sharing an original and clamps unavailable step indices', () => {
  const round = createSyntheticAttackRound();
  round.traces.push(structuredClone(round.traces[0]));
  round.traces[1].modifiedTx!.outputs = [];
  expect(txNode(mapTestRoundToGraphData('attack-timeline', round, 999)).outputCount).toBe(0);
  expect(mapTestRoundToGraphData('attack-timeline', round, 1).transactions).toHaveLength(1);
  expect(txNode(mapTestRoundToGraphData('attack-timeline', round, -1)).outputCount).toBe(4);
  expect(mapTestRoundToGraphData('result-graph', round, 0).transactions).toHaveLength(1);
});

it('renders missing hashes and duplicate input references without merging candidate occurrences', () => {
  const round = createSyntheticAttackRound();
  const tx = round.traces[0].modifiedTx!;
  tx.id = undefined;
  tx.inputs = [tx.inputs[1], structuredClone(tx.inputs[1])];
  const graph = mapTestRoundToGraphData('attack-timeline', round, 0);
  expect(txNode(graph).id.current).toBe('');
  expect(txNode(graph).warning).toMatch(/Repeated references/);
  expect(graph.nodes).toHaveLength(7);
  expect(new Set(graph.nodes.map(n => n.id)).size).toBe(7);
  expect(graph.nodes.filter(n => (n.data as GraphNodeUTxO).utxo?.current === 'script#0')).toHaveLength(2);
  expect(graph.nodes.filter(n => (n.data as GraphNodeUTxO).utxo?.current === 'script#0').every(n => !(n.data as GraphNodeUTxO).value?.comparisonAvailable)).toBe(true);
});

it('keeps every edge endpoint and transaction handle resolvable', () => {
  const graph = mapTestRoundToGraphData('attack-timeline', createSyntheticAttackRound(), 0);
  const ids = new Set(graph.nodes.map(n => n.id));
  const handles = new Set(['i-0', 'i-1', 'i-2', 'o-0', 'o-1', 'o-2', 'o-3'].map(suffix => `${graph.transactions[0].nodeId}-${suffix}`));
  for (const edge of graph.edges) {
    expect(ids.has(edge.source) && ids.has(edge.target)).toBe(true);
    expect(handles.has(edge.sourceHandle ?? edge.targetHandle!)).toBe(true);
  }
});

it('handles empty rounds and preserves transition result status', () => {
  const round = createSyntheticAttackRound();
  const transition: TransitionTestRound = { ...round, type: 'negative', transitions: [{ action: 'synthetic', stepIndex: 0, tx: round.traces[0].tx, result: { status: 'failure', error: 'controlled error' } }] };
  expect(txNode(mapTestRoundToGraphData('result-graph', transition, 0)).status).toBe('failure');
  round.traces = [];
  expect(mapTestRoundToGraphData('attack-timeline', round, 0)).toEqual({ nodes: [], edges: [], stepNodes: [], transactions: [] });
});
