import { MarkerType } from '@xyflow/react';
import type { Node, Edge, XYPosition } from '@xyflow/react';

const NODE_COLUMN_WIDTH = 340;
const NODE_VERTICAL_GAP = 40;
const NODE_COLLISION_MARGIN = 20;
const NODE_COLLISION_ITERATIONS = 50;
const NODE_COLLISION_OVERLAP_THRESHOLD = 0.5;

type InternalGraphData = {
  nodes: Array<Node>;
  edges: Array<Edge>;
};

export type GraphData = {
  nodes: Array<Node>;
  edges: Array<Edge>;
  stepNodes: Array<string>;
  transactions: Array<{ nodeId: string; data: GraphNodeTx }>;
};

type CollisionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  moved: boolean;
  node: Node;
};

export const resolveNodeCollisions = (nodes: Array<Node>): Array<Node> => {
  const boxes: Array<CollisionBox> = nodes.map(node => ({
    x: node.position.x - NODE_COLLISION_MARGIN,
    y: node.position.y - NODE_COLLISION_MARGIN,
    width: (node.measured?.width ?? node.width ?? 0) + NODE_COLLISION_MARGIN * 2,
    height: (node.measured?.height ?? node.height ?? 0) + NODE_COLLISION_MARGIN * 2,
    moved: false,
    node,
  }));

  for (let iteration = 0; iteration < NODE_COLLISION_ITERATIONS; iteration++) {
    let moved = false;

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const first = boxes[i];
        const second = boxes[j];
        const deltaX = first.x + first.width / 2 - (second.x + second.width / 2);
        const deltaY = first.y + first.height / 2 - (second.y + second.height / 2);
        const overlapX = (first.width + second.width) / 2 - Math.abs(deltaX);
        const overlapY = (first.height + second.height) / 2 - Math.abs(deltaY);

        if (overlapX <= NODE_COLLISION_OVERLAP_THRESHOLD || overlapY <= NODE_COLLISION_OVERLAP_THRESHOLD) continue;

        first.moved = true;
        second.moved = true;
        moved = true;

        if (overlapX < overlapY) {
          const amount = overlapX / 2 * (deltaX > 0 ? 1 : -1);
          first.x += amount;
          second.x -= amount;
        } else {
          const amount = overlapY / 2 * (deltaY > 0 ? 1 : -1);
          first.y += amount;
          second.y -= amount;
        }
      }
    }

    if (!moved) break;
  }

  return boxes.map(box => box.moved ? {
    ...box.node,
    position: {
      x: box.x + NODE_COLLISION_MARGIN,
      y: box.y + NODE_COLLISION_MARGIN,
    },
  } : box.node);
};

export const applyMeasuredLayout = (nodes: Array<Node>): Record<string, XYPosition> => {
  const columns: Record<number, Array<Node>> = {};
  for (const node of nodes) {
    columns[node.position.x] = columns[node.position.x] ?? [];
    columns[node.position.x].push(node);
  }

  const getColumnHeight = (column: Array<Node>): number =>
    column.reduce((height, node) => height + (node.measured?.height ?? node.height ?? 0), 0) +
    Math.max(0, column.length - 1) * NODE_VERTICAL_GAP;

  const maxColumnHeight = Math.max(0, ...Array.from(Object.values(columns), getColumnHeight));
  const positions: Record<string, XYPosition> = {};
  for (const column of Object.values(columns)) {
    let positionY = (maxColumnHeight - getColumnHeight(column)) / 2;
    for (const node of column) {
      positions[node.id] = { x: node.position.x, y: positionY };
      positionY += (node.measured?.height ?? node.height ?? 0) + NODE_VERTICAL_GAP;
    }
  }

  return positions;
};

const mapGraphTxsToGraphData = (graphTxs: Array<GraphTx>): InternalGraphData => {
  const nodes: Record<string, Node> = {};
  const edges: Record<string, Edge> = {};
  const columns: Array<Array<Node>> = [];

  for (let i = 0; i < graphTxs.length; i++) {
    const tx = graphTxs[i].tx;
    const txId = `tx-${tx.identifier}`;
    let iColN = i * 2;
    let tColN = iColN + 1;
    let oColN = tColN + 1;

    if (nodes[txId] !== undefined) {
      tColN = nodes[txId].position.x / NODE_COLUMN_WIDTH;
      iColN = tColN - 1;
      oColN = tColN + 1;

      for (const [edgeId, edge] of Object.entries(edges)) {
        if (edge.source === txId || edge.target === txId) delete edges[edgeId];
      }
    }

    if (!columns[iColN]) columns[iColN] = [];
    if (!columns[tColN]) columns[tColN] = [];
    if (!columns[oColN]) columns[oColN] = [];

    nodes[txId] = {
      id: txId,
      type: 'tx',
      data: tx,
      zIndex: 10,
      position: {
        x: tColN * NODE_COLUMN_WIDTH,
        y: 0
      }
    };

    columns[tColN].push(nodes[txId]);

    for (let j = 0; j < graphTxs[i].inputs.length; j++) {
      const txHandler = `${txId}-i-${j}`;
      const utxoId = `utxo-${graphTxs[i].inputs[j].identifier}`;
      if (nodes[utxoId] !== undefined) {
        nodes[utxoId]['data'] = {
          ...nodes[utxoId]['data'],
          ...graphTxs[i].inputs[j],
          consumed: true,
        };
      } else {
        nodes[utxoId] = {
          id: utxoId,
          type: graphTxs[i].inputs[j].type,
          data: {
            ...graphTxs[i].inputs[j],
            consumed: true,
          },
          zIndex: 10,
          position: {
            x: iColN * NODE_COLUMN_WIDTH,
            y: 0
          }
        };
        columns[iColN].push(nodes[utxoId]);
      }
      const edgeId = `edge-${utxoId}-to-${txHandler}`;
      edges[edgeId] = {
        id: edgeId,
        type: 'smoothstep',
        source: utxoId,
        target: txId,
        targetHandle: txHandler,
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

    for (let j = 0; j < graphTxs[i].outputs.length; j++) {
      const txHandler = `${txId}-o-${j}`;
      const utxoId = `utxo-${graphTxs[i].outputs[j].identifier}`;
      if (nodes[utxoId] !== undefined) {
        nodes[utxoId]['data'] = {
          ...nodes[utxoId]['data'],
          ...graphTxs[i].outputs[j],
          consumed: nodes[utxoId]['data'].consumed,
        };
      } else {
        nodes[utxoId] = {
          id: utxoId,
          type: graphTxs[i].outputs[j].type,
          data: graphTxs[i].outputs[j],
          zIndex: 10,
          position: {
            x: oColN * NODE_COLUMN_WIDTH,
            y: 0
          }
        };
        columns[oColN].push(nodes[utxoId]);
      }
      const edgeId = `edge-${txHandler}-to-${utxoId}`;
      edges[edgeId] = {
        id: edgeId,
        type: 'smoothstep',
        source: txId,
        sourceHandle: txHandler,
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

    for (let j = 0; j < graphTxs[i].withdrawals.length; j++) {
      const txHandler = `${txId}-w-${j}`;
      const utxoId = `withdrawal-${tx.identifier}-${j}`;
      if (nodes[utxoId] !== undefined) {
        nodes[utxoId]['data'] = {
          ...nodes[utxoId]['data'],
          ...graphTxs[i].withdrawals[j],
        };
      } else {
        nodes[utxoId] = {
          id: utxoId,
          type: graphTxs[i].withdrawals[j].type,
          data: graphTxs[i].withdrawals[j],
          zIndex: 10,
          position: {
            x: oColN * NODE_COLUMN_WIDTH,
            y: 0
          }
        };
        columns[oColN].push(nodes[utxoId]);
      }
      const edgeId = `edge-${txHandler}-to-${utxoId}`;
      edges[edgeId] = {
        id: edgeId,
        type: 'smoothstep',
        source: txId,
        sourceHandle: txHandler,
        target: utxoId,
        selectable: true,
        pathOptions: {
          borderRadius: 40
        },
        markerEnd: {
          type: MarkerType.Arrow,
          height: 20, width: 20
        }
      } as Edge;
    }
  }

  const connectedNodeIds = new Set<string>();
  const sourceNodeIds = new Set<string>();
  for (const edge of Object.values(edges)) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
    sourceNodeIds.add(edge.source);
  }

  return {
    edges: Object.values(edges),
    nodes: Object.values(nodes)
      .filter(node => node.type === 'tx' || connectedNodeIds.has(node.id))
      .map(node => node.type === 'tx' ? node : {
        ...node,
        data: { ...node.data, consumed: sourceNodeIds.has(node.id) },
      })
  };
};

const graphValue = <T>(current: T, previous?: T, comparisonAvailable = false): GraphNodeValue<T> => ({
  current, ...(comparisonAvailable ? { previous, comparisonAvailable: true } : {}),
});

// Duplicate references cannot establish a unique counterpart.
const uniqueBy = <T>(items: T[], key: (item: T) => string): Map<string, T | undefined> => {
  const result = new Map<string, T | undefined>();
  for (const item of items) {
    const id = key(item);
    result.set(id, result.has(id) ? undefined : item);
  }
  return result;
};

const validationStatus = (validation?: ThreatModelValidation): Pick<GraphNodeTx, 'status' | 'statusLabel'> => {
  switch (validation?.status) {
    case 'valid': return { status: 'success', statusLabel: 'Candidate valid' };
    case 'phase1_invalid': return { status: 'failure', statusLabel: 'Candidate rejected in phase 1' };
    case 'phase2_invalid': return { status: 'failure', statusLabel: 'Candidate rejected in phase 2' };
    case 'rebalance_failed': return { status: 'not-evaluated', statusLabel: 'Rebalancing failed' };
    default: return { status: 'unknown', statusLabel: 'Validation unknown' };
  }
};

const mapSnapshot = (
  tx: Tx, index: number, status: GraphNodeTx['status'],
  identifier = tx.id || `missing-id-${index}`, previous?: Tx, scoped = false,
): GraphTx => {
  const originals = uniqueBy(previous?.inputs ?? [], input => input.utxo);
  const inputs = uniqueBy(tx.inputs, input => input.utxo);
  const outputs = uniqueBy(tx.outputs, output => output.utxo);
  const oldWithdrawals = uniqueBy(previous?.withdrawals ?? [], w => w.stakeAddress);
  const withdrawals = uniqueBy(tx.withdrawals, w => w.stakeAddress);
  return {
    tx: {
      identifier, label: `Transaction #${index + 1}`, type: 'tx', status,
      warning: inputs.size < tx.inputs.length || outputs.size < tx.outputs.length || withdrawals.size < tx.withdrawals.length
        ? 'Repeated references in this snapshot; ambiguous elements are not compared.' : undefined,
      id: graphValue(tx.id ?? '', previous?.id ?? '', !!previous),
      fee: graphValue(tx.fee, previous?.fee, !!previous),
      signers: graphValue(tx.signers, previous?.signers, !!previous),
      mint: graphValue(tx.mint, previous?.mint, !!previous),
      inputCount: tx.inputs.length, outputCount: tx.outputs.length, withdrawalCount: tx.withdrawals.length,
    },
    inputs: tx.inputs.map((input, i) => {
      const old = input.utxo && inputs.get(input.utxo) ? originals.get(input.utxo) : undefined;
      return {
        identifier: scoped || !input.utxo || !inputs.get(input.utxo) ? `${identifier}-input-${i}` : input.utxo,
        label: input.addressLabel ?? (input.addressType === 'script' ? 'Script' : 'Wallet'),
        type: input.addressType === 'script' ? 'script' : 'wallet', consumed: false,
        address: graphValue(input.address, old?.address, !!old),
        utxo: graphValue(input.utxo, old?.utxo, !!old),
        value: graphValue(input.value, old?.value, !!old),
        redeemer: graphValue(input.redeemerKind, old?.redeemerKind, !!old),
      };
    }),
    // Output position and content do not establish provenance across transaction hashes.
    outputs: tx.outputs.map((output, i) => ({
      identifier: scoped || !output.utxo || !outputs.get(output.utxo) ? `${identifier}-output-${i}` : output.utxo,
      label: output.addressLabel ?? (output.addressType === 'script' ? 'Script' : 'Wallet'),
      type: output.addressType === 'script' ? 'script' : 'wallet', consumed: false,
      address: graphValue(output.address), utxo: graphValue(output.utxo),
      value: graphValue(output.value), datum: graphValue(output.datum),
    })),
    withdrawals: tx.withdrawals.map((withdrawal, i) => {
      const old = withdrawal.stakeAddress && withdrawals.get(withdrawal.stakeAddress) ? oldWithdrawals.get(withdrawal.stakeAddress) : undefined;
      return {
        identifier: `${identifier}-withdrawal-${i}`, label: withdrawal.addressLabel ?? 'Withdrawal',
        type: 'withdrawal', consumed: false,
        stakeAddress: graphValue(withdrawal.stakeAddress, old?.stakeAddress, !!old),
        redeemer: graphValue(withdrawal.redeemerKind, old?.redeemerKind, !!old),
        amount: graphValue(withdrawal.amount, old?.amount, !!old),
      };
    }),
  };
};

export const mapTestRoundToGraphData = (
  mode: GraphMode, round: TestRound, stepIndex: number, snapshot: GraphSnapshot = 'modified',
): GraphData => {
  const graphTxs: GraphTx[] = [];
  if (round.type === 'positive' || round.type === 'negative') {
    for (const [index, transition] of (round as TransitionTestRound).transitions.entries()) {
      if (transition.tx) graphTxs.push(mapSnapshot(transition.tx, index, transition.result.status));
    }
  } else {
    const traces = (round as ThreatModelTestRound).traces;
    const selectedIndex = Math.min(Math.max(0, Number.isFinite(stepIndex) ? Math.trunc(stepIndex) : 0), Math.max(0, traces.length - 1));
    for (const [index, trace] of traces.entries()) {
      if (mode === 'attack-timeline' && index !== selectedIndex) continue;
      const candidate = mode === 'attack-timeline' && snapshot === 'modified' ? trace.modifiedTx : undefined;
      const tx = candidate ?? trace.tx;
      const identifier = mode === 'attack-timeline'
        ? `attack-${round.id}-${index}-${candidate ? 'modified' : 'original'}`
        : tx.id || `missing-id-${index}`;
      const graphTx = mapSnapshot(tx, index, 'unknown', identifier, candidate ? trace.tx : undefined, mode === 'attack-timeline');
      Object.assign(graphTx.tx, candidate ? validationStatus(trace.validation) : { statusLabel: 'Original transaction; validation not supplied' });
      graphTxs.push(graphTx);
    }
  }
  const graph = mapGraphTxsToGraphData(graphTxs);
  const first = graphTxs[0];
  const stepNodes = first ? [
    `tx-${first.tx.identifier}`,
    ...first.inputs.map(n => `utxo-${n.identifier}`),
    ...first.outputs.map(n => `utxo-${n.identifier}`),
    ...first.withdrawals.map((_, i) => `withdrawal-${first.tx.identifier}-${i}`),
  ] : [];
  return {
    ...graph, stepNodes,
    transactions: graph.nodes.filter(n => n.type === 'tx').map(n => ({ nodeId: n.id, data: n.data as GraphNodeTx })),
  };
};
