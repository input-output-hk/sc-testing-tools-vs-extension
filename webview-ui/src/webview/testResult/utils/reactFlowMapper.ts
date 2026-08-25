import { MarkerType } from '@xyflow/react';

import type { Node, Edge } from '@xyflow/react';

const COLUMN_WIDTH = 340;
const ROW_HEIGHT = 320;

const GRAPH_NODE_WIDTH = 240;
const GRAPH_TX_NODE_HEIGHT = 120;
const GRAPH_UTXO_NODE_HEIGHT = 240;

export type GraphData = {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
};

type TxWithStatus = Tx & {
  success: boolean;
};

const mapTxsToGrapData = (txs: Array<TxWithStatus>): GraphData => {
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
      const input = { ...tx.inputs[j], type: 'utxo', hasSource: true };
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
      const output = { ...tx.outputs[j], type: 'utxo', hasSource: false };
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
  round: TestRound,
  onViewDetails: (node: GraphNode) => void
): GraphData => {
  let txs: Array<TxWithStatus> = [];

  if (round.type === 'positive' || round.type === 'negative') {
    txs = (round as TransitionTestRound).transitions
      .filter(t => t.tx !== undefined)
      .map(t => ({ ...t.tx!, success: t.result.status === 'success' }))
  }

  if (round.type === 'threat-model') {
    txs = (round as ThreatModelTestRound).traces
      .map(t => ({ ...t.tx, success: t.outcome.status === 'passed' }));
  }

  const { nodes, edges } = mapTxsToGrapData(txs);
  for (const node of Object.values(nodes)) {
    node.data = {
      ...node.data,
      onViewDetails,
    };
  }

  return { nodes, edges };
}