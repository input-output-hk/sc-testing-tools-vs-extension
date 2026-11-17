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
        style: graphTxs[i].inputs[j].type === 'script' ? {
          strokeDasharray: "6 3"
        } : undefined
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
      const utxoId = `utxo-${graphTxs[i].withdrawals[j].identifier}`;
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

const mapTxToGraphTx = (tx: Tx, index: number, status: GraphNodeTx['status']): GraphNodeTx => ({
  identifier: tx.id ?? '',
  label: `Transaction #${index + 1}`,
  type: 'tx',
  status,
  id: { current: tx.id ?? '', previous: tx.id ?? '' },
  fee: { current: tx.fee, previous: tx.fee },
  signers: { current: tx.signers, previous: tx.signers },
  mint: { current: tx.mint, previous: tx.mint },
  inputCount: tx.inputs.length,
  outputCount: tx.outputs.length,
  withdrawalCount: tx.withdrawals.length,
});

const mapModifiedTxToGraphTx = (
  tx: Tx,
  modifiedTx: Tx,
  index: number,
  status: GraphNodeTx['status']
): GraphNodeTx => ({
  identifier: tx.id ?? '',
  label: `Transaction #${index + 1}`,
  type: 'tx',
  status,
  inputCount: modifiedTx.inputs.length,
  outputCount: modifiedTx.outputs.length,
  withdrawalCount: modifiedTx.withdrawals.length,
  id: {
    current: modifiedTx.id ?? '',
    previous: tx.id ?? '',
  },
  mint: {
    current: modifiedTx.mint,
    previous: tx.mint,
  },
  fee: {
    current: modifiedTx.fee,
    previous: tx.fee,
  },
  signers: {
    current: modifiedTx.signers,
    previous: tx.signers,
  },
});

const mapTxInputToGraphUTxO = (input: TxInput): GraphNodeUTxO => ({
  identifier: input.utxo,
  label: input.addressLabel ?? input.addressType,
  type: input.addressType === 'script' ? 'script' : 'wallet',
  address: { current: input.address, previous: input.address },
  utxo: { current: input.utxo, previous: input.utxo },
  value: { current: input.value, previous: input.value },
  redeemer: { current: input.redeemerKind, previous: input.redeemerKind },
  consumed: false,
});

const mapModifiedTxInputToGraphUTxO = (input: TxInput | undefined, modifiedInput: TxInput): GraphNodeUTxO => ({
  identifier: modifiedInput.utxo,
  label: modifiedInput.addressLabel ?? modifiedInput.addressType,
  type: modifiedInput.addressType === 'script' ? 'script' : 'wallet',
  address: {
    current: modifiedInput.address,
    previous: input?.address,
  },
  utxo: {
    current: modifiedInput.utxo,
    previous: input?.utxo,
  },
  value: {
    current: modifiedInput.value,
    previous: input?.value,
  },
  redeemer: {
    current: modifiedInput.redeemerKind,
    previous: input?.redeemerKind,
  },
  consumed: false,
});

const mapTxOutputToGraphUTxO = (output: TxOutput): GraphNodeUTxO => ({
  identifier: output.utxo,
  label: output.addressLabel ?? output.addressType,
  type: output.addressType === 'script' ? 'script' : 'wallet',
  address: { current: output.address, previous: output.address },
  utxo: { current: output.utxo, previous: output.utxo },
  value: { current: output.value, previous: output.value },
  datum: { current: output.datum, previous: output.datum },
  consumed: false,
});

const mapModifiedTxOutputToGraphUTxO = (output: TxOutput | undefined, modifiedOutput: TxOutput): GraphNodeUTxO => ({
  identifier: modifiedOutput.utxo,
  label: modifiedOutput.addressLabel ?? modifiedOutput.addressType,
  type: modifiedOutput.addressType === 'script' ? 'script' : 'wallet',
  address: {
    current: modifiedOutput.address,
    previous: output?.address,
  },
  utxo: {
    current: modifiedOutput.utxo,
    previous: output?.utxo,
  },
  value: {
    current: modifiedOutput.value,
    previous: output?.value,
  },
  datum: {
    current: modifiedOutput.datum,
    previous: output?.datum,
  },
  consumed: false,
});

const getOriginalOutputs = (tx: Tx, modifications: Array<TxMod>): Array<TxOutput | undefined> => {
  let outputs: Array<TxOutput | undefined> = [...tx.outputs];
  for (const mod of modifications) {
    if (mod.type === 'removeOutput') outputs.splice(mod.index, 1);
    else if (mod.type === 'addOutput') outputs.push(undefined);
    else if (mod.type === 'replaceTx') outputs = [];
  }
  return outputs;
};

const mapTxWithdrawalToGraphUTxO = (withdrawal: TxWithdrawal): GraphNodeUTxO => ({
  identifier: withdrawal.stakeAddress,
  label: withdrawal.addressLabel ?? 'withdrawal',
  type: 'withdrawal',
  stakeAddress: { current: withdrawal.stakeAddress, previous: withdrawal.stakeAddress },
  redeemer: { current: withdrawal.redeemerKind, previous: withdrawal.redeemerKind },
  amount: { current: withdrawal.amount, previous: withdrawal.amount },
  consumed: false,
});

const mapTransitionTestRoundToGraphData = (round: TransitionTestRound): GraphData => {
  const graphTxs: Array<GraphTx> = [];
  const stepNodes: Array<string> = [];

  for (const [index, transition] of round.transitions.entries()) {
    if (!transition.tx) continue;
    graphTxs.push({
      tx: mapTxToGraphTx(transition.tx, index, transition.result.status),
      inputs: transition.tx.inputs.map(mapTxInputToGraphUTxO),
      outputs: transition.tx.outputs.map(mapTxOutputToGraphUTxO),
      withdrawals: transition.tx.withdrawals.map(mapTxWithdrawalToGraphUTxO),
    });
  }

  if (graphTxs.length > 0) {
    stepNodes.push(...[
      `tx-${graphTxs[0].tx.identifier}`,
      ...graphTxs[0].inputs.map(({ identifier }) => `utxo-${identifier}`),
      ...graphTxs[0].outputs.map(({ identifier }) => `utxo-${identifier}`)
    ]);
  }

  return {
    ...mapGraphTxsToGraphData(graphTxs),
    stepNodes
  };
};

const mapThreatModelTestRoundToGraphData = (
  mode: GraphMode,
  round: ThreatModelTestRound,
  stepIndex: number
): GraphData => {
  const graphTxs: Array<GraphTx> = [];
  const stepNodes: Array<string> = [];

  for (const [index, trace] of round.traces.entries()) {
    if (mode === 'attack-timeline' && index > stepIndex) {
      break;
    }
    if (mode === 'result-graph' || index < stepIndex || !trace.modifiedTx) {
      graphTxs.push({
        tx: mapTxToGraphTx(trace.tx, index, 'success'),
        inputs: trace.tx.inputs.map(mapTxInputToGraphUTxO),
        outputs: trace.tx.outputs.map(mapTxOutputToGraphUTxO),
        withdrawals: trace.tx.withdrawals.map(mapTxWithdrawalToGraphUTxO),
      });
    } else {
      const originalOutputs = getOriginalOutputs(trace.tx, trace.modifications);
      graphTxs.push({
        tx: mapModifiedTxToGraphTx(
          trace.tx,
          trace.modifiedTx,
          index,
          trace.validation?.status !== 'valid' ? 'failure' : 'success'
        ),
        inputs: trace.modifiedTx.inputs.map(modifiedInput => {
          const input = trace.tx.inputs.find(i => i.utxo === modifiedInput.utxo);
          return mapModifiedTxInputToGraphUTxO(input, modifiedInput);
        }),
        outputs: trace.modifiedTx.outputs.map((modifiedOutput, outputIndex) =>
          mapModifiedTxOutputToGraphUTxO(originalOutputs[outputIndex], modifiedOutput)
        ),
        withdrawals: trace.modifiedTx.withdrawals.map(mapTxWithdrawalToGraphUTxO),
      });
    }
  }

  if (graphTxs.length > 0) {
    const index = graphTxs.length > stepIndex ? stepIndex : 0;
    stepNodes.push(...[
      `tx-${graphTxs[index].tx.identifier}`,
      ...graphTxs[index].inputs.map(({ identifier }) => `utxo-${identifier}`),
      ...graphTxs[index].outputs.map(({ identifier }) => `utxo-${identifier}`)
    ]);
  }

  return {
    ...mapGraphTxsToGraphData(graphTxs),
    stepNodes
  };
};

export const mapTestRoundToGraphData = (
  mode: GraphMode,
  round: TestRound,
  stepIndex: number
): GraphData => {
  if (round.type === 'positive' || round.type === 'negative') {
    return mapTransitionTestRoundToGraphData(
      round as TransitionTestRound
    );
  } else {
    return mapThreatModelTestRoundToGraphData(
      mode, round as ThreatModelTestRound, stepIndex
    );
  }
};
