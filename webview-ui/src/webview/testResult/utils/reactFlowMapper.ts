import { MarkerType } from '@xyflow/react';

import type { Node, Edge } from '@xyflow/react';

import { txValueToString } from './txUtils';

const COLUMN_WIDTH = 340;
const ROW_HEIGHT = 340;

const GRAPH_NODE_WIDTH = 240;
const GRAPH_TX_NODE_HEIGHT = 120;
const GRAPH_UTXO_NODE_HEIGHT = 240;

export type GraphData = {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  diff?: Array<string>;
};

const mapTxModifications = (tx: Tx, originalTx: Tx, modifications: TxMod[]): Record<string, ModifiedField> => {
  const mods: Record<string, ModifiedField> = {};
  for (const mod of modifications) {
    if (mod.type === 'removeRequiredSigner') {
      mods['signers'] = {
        field: 'signers',
        value: originalTx.signers?.join(', ') ?? '',
      }
    }
  }
  if (tx.id !== originalTx.id) {
    mods['id'] = {
      field: 'id',
      value: originalTx.id ?? '',
    };
  }
  if (tx.fee !== originalTx.fee) {
    mods['fee'] = {
      field: 'fee',
      value: `${originalTx.fee} lovelace`,
    };
  }
  if (txValueToString(tx.mint) !== txValueToString(originalTx.mint)) {
    mods['mint'] = {
      field: 'mint',
      value: txValueToString(originalTx.mint),
    };
  }
  return mods;
}

const mapInputModifications = (tx: TxWithContext, inputIndex: number): Record<string, ModifiedField> => {
  if (tx.context.origin === 'transition') return {};
  const mods: Record<string, ModifiedField> = {};
  const input: TxInput = tx.inputs[inputIndex];
  const originalTx: Tx | undefined = (tx as TxWithThreatModel).context.originalTx;
  const originalInput: TxInput | undefined = originalTx?.inputs[inputIndex];
  if (originalInput) {
    for (const mod of (tx as TxWithThreatModel).context.modifications) {
      if (mod.type === 'changeInput' && (mod.utxo === input.utxo || mod.utxo === originalInput.utxo)) {
        if (mod.address) {
          mods['address'] = {
            field: 'address',
            value: originalInput.address,
          };
        }
        if (mod.value) {
          mods['value'] = {
            field: 'value',
            value: txValueToString(originalInput.value),
          };
        }
      }
    }
    if (input.redeemerRaw !== originalInput.redeemerRaw) {
      mods['redeemer'] = {
        field: 'redeemer',
        value: originalInput.redeemerRaw ?? '',
      };
    }
    if (input.utxo !== originalInput.utxo) {
      mods['utxo'] = {
        field: 'utxo',
        value: originalInput.utxo,
      };
    }
    if (txValueToString(input.value) !== txValueToString(originalInput.value)) {
      mods['value'] = {
        field: 'value',
        value: txValueToString(originalInput.value),
      };
    }
  }
  return mods;
};

const mapOutputModifications = (tx: TxWithContext, outputIndex: number): Record<string, ModifiedField> => {
  if (tx.context.origin === 'transition') return {};
  const mods: Record<string, ModifiedField> = {};
  const output: TxOutput = tx.outputs[outputIndex];
  const originalTx: Tx | undefined = (tx as TxWithThreatModel).context.originalTx;
  const originalOutput: TxOutput | undefined = originalTx?.outputs[outputIndex];
  if (originalOutput) {
    for (const mod of (tx as TxWithThreatModel).context.modifications) {
      if (mod.type === 'changeOutput' && mod.index === output.index) {
        if (mod.address) {
          mods['address'] = {
            field: 'address',
            value: originalOutput.address,
          };
        }
        if (mod.datum) {
          mods['datum'] = {
            field: 'datum',
            value: originalOutput.datum ?? '',
          };
        }
        if (mod.value) {
          mods['value'] = {
            field: 'value',
            value: txValueToString(originalOutput.value),
          };
        }
      }
    }
    if (output.utxo !== originalOutput.utxo) {
      mods['utxo'] = {
        field: 'utxo',
        value: originalOutput.utxo,
      };
    }
    if (txValueToString(output.value) !== txValueToString(originalOutput.value)) {
      mods['value'] = {
        field: 'value',
        value: txValueToString(originalOutput.value),
      };
    }
  }
  return mods;
};

const mapTxsToGrapData = (txs: Array<TxWithContext>): GraphData => {
  const nodes: Record<string, Node> = {};
  const edges: Record<string, Edge> = {};
  const columns: Array<Array<Node>> = [];

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const txId = `tx-${tx.id}`;
    const iColN = i * 2;
    const tColN = iColN + 1;
    const oColN = tColN + 1;

    if (!columns[iColN]) columns[iColN] = [];
    if (!columns[tColN]) columns[tColN] = [];
    if (!columns[oColN]) columns[oColN] = [];
    
    nodes[txId] = {
      id: txId,
      type: 'tx',
      data: { 
        ...tx,
        type: 'tx',
        hasSource: true
      },
      zIndex: 10,
      initialWidth: GRAPH_NODE_WIDTH,
      initialHeight: GRAPH_TX_NODE_HEIGHT,
      position: {
        x: tColN * COLUMN_WIDTH,
        y: columns[tColN].length * ROW_HEIGHT
      }
    };

    columns[tColN].push(nodes[txId]);

    for (let j = 0; j < tx.inputs.length; j++) {
      const input = {
        ...tx.inputs[j],
        type: 'utxo',
        hasSource: true,
        context: {
          origin: tx.context.origin,
          originalFields: mapInputModifications(tx, j),
        }
      };
      const utxoId = `utxo-${input.utxo}`;
      if (nodes[utxoId] !== undefined) {
        nodes[utxoId]['data'] = {
          ...nodes[utxoId]['data'],
          ...input
        };
      } else {
        nodes[utxoId] = {
          id: utxoId,
          type: 'utxo',
          data: input,
          zIndex: 10,
          initialWidth: GRAPH_NODE_WIDTH,
          initialHeight: GRAPH_UTXO_NODE_HEIGHT,
          position: {
            x: iColN * COLUMN_WIDTH,
            y: columns[iColN].length * ROW_HEIGHT
          }
        };
        columns[iColN].push(nodes[utxoId]);
      }
      const edgeId = `edge-${utxoId}-to-${txId}`;
      edges[edgeId] = {
        id: edgeId,
        type: 'smoothstep',
        source: utxoId,
        target: txId,
        selectable: true,
        pathOptions: {
          borderRadius: 40
        },
        markerEnd: {
          type: MarkerType.Arrow,
          height: 20, width: 20
        },
      } as Edge;
    }

    for (let j = 0; j < tx.outputs.length; j++) {
      const output = {
        ...tx.outputs[j],
        type: 'utxo',
        hasSource: false,
        context: {
          origin: tx.context.origin,
          originalFields: mapOutputModifications(tx, j),
        }
      };
      const utxoId = `utxo-${output.utxo}`;
      if (nodes[utxoId] !== undefined) {
        nodes[utxoId]['data'] = {
          ...nodes[utxoId]['data'],
          ...output
        };
      } else {
        nodes[utxoId] = {
          id: utxoId,
          type: 'utxo',
          data: output,
          zIndex: 10,
          initialWidth: GRAPH_NODE_WIDTH,
          initialHeight: GRAPH_UTXO_NODE_HEIGHT,
          position: {
            x: oColN * COLUMN_WIDTH,
            y: columns[oColN].length * ROW_HEIGHT
          }
        };
        columns[oColN].push(nodes[utxoId]);
      }
      const edgeId = `edge-${txId}-to-${utxoId}`;
      edges[edgeId] = {
        id: edgeId,
        type: 'smoothstep',
        source: txId,
        target: utxoId,
        selectable: true,
        pathOptions: {
          borderRadius: 40
        },
        markerEnd: {
          type: MarkerType.Arrow,
          height: 20, width: 20
        },
      } as Edge;
    }
  }

  const maxHeight = Math.max(...columns.map(nodes => nodes.length));
  for (const nodes of columns) {
    if (nodes.length < maxHeight) {
      const diff = (maxHeight - nodes.length) * ROW_HEIGHT / 2;
      for (const node of nodes) {
        node.position.y += diff;
      }
    }
  }

  return { edges, nodes };
} 

export const mapTestRoundToGraphData = (
  mode: GraphMode,
  trace: number,
  round: TestRound,
  onViewDetails: (node: GraphNode) => void
): GraphData => {
  let diff: Set<string> = new Set<string>();
  let txs: Array<TxWithContext> = [];

  if (round.type === 'positive' || round.type === 'negative') {
    txs = (round as TransitionTestRound).transitions
      .filter(t => t.tx !== undefined)
      .map((t, index) => ({
        ...t.tx!,
        type: 'tx' as const,
        context: {
          index,
          origin: 'transition' as const,
          status: round.status
        }
      }));
    
    if (txs.length > 0) {
      diff.add(`tx-${txs[0].id}`);
      for (const input of txs[0].inputs) diff.add(`utxo-${input.utxo}`);
      for (const output of txs[0].outputs) diff.add(`utxo-${output.utxo}`);
    }
  }

  if (round.type === 'threat-model' && mode === 'result-graph') {
    txs = (round as ThreatModelTestRound).traces
      .map((t, index) => ({
        ...t.tx,
        type: 'tx' as const,
        context: {
          index,
          origin: 'threat-model' as const,
          outcome: t.outcome,
          modifications: t.modifications
        }
      }));
    
    if (txs.length > 0) {
      const index = txs.length > trace ? trace : 0;
      diff.add(`tx-${txs[index].id}`);
      for (const input of txs[index].inputs) diff.add(`utxo-${input.utxo}`);
      for (const output of txs[index].outputs) diff.add(`utxo-${output.utxo}`);
    }
  }

  if (round.type === 'threat-model' && mode === 'attack-timeline') {
    txs = (round as ThreatModelTestRound).traces
      .map((t, index) => {
        if (index > trace) return null;
        if (index < trace) return {
          ...t.tx,
          type: 'tx' as const,
          context: {
            index,
            origin: 'threat-model' as const,
            outcome: t.outcome,
            originalTx: t.tx,
            modifications: t.modifications,
            originalFields: {},
          }
        };
        
        const tx = t.modifiedTx ? t.modifiedTx : t.tx;
        diff = new Set<string>([
          `tx-${tx.id}`,
          ...tx.inputs.map(i => `utxo-${i.utxo}`),
          ...tx.outputs.map(o => `utxo-${o.utxo}`),
        ]);

        return {
          ...tx,
          type: 'tx' as const,
          context: {
            index,
            origin: 'threat-model' as const,
            originalTx: t.tx,
            outcome: t.outcome,
            modifications: t.modifications,
            originalFields: mapTxModifications(tx, t.tx, t.modifications),
          }
        };
      })
      .filter(t => t !== null);
  }

  const { nodes, edges } = mapTxsToGrapData(txs);
  for (const node of Object.values(nodes)) {
    node.data = {
      ...node.data,
      onViewDetails,
    };
  }

  return { nodes, edges, diff: Array.from(diff) };
}