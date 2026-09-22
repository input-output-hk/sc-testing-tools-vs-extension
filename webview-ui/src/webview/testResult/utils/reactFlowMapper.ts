import { MarkerType } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

const COLUMN_WIDTH = 340;
const ROW_HEIGHT = 340;

const GRAPH_NODE_WIDTH = 240;
const GRAPH_TX_NODE_HEIGHT = 120;
const GRAPH_UTXO_NODE_HEIGHT = 240;

type InternalGraphData = {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
};

export type GraphData = {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  stepNodes: Array<string>;
};

const mapGraphTxsToGraphData = (graphTxs: Array<GraphTx>): InternalGraphData => {
  const nodes: Record<string, Node> = {};
  const edges: Record<string, Edge> = {};
  const columns: Array<Array<Node>> = [];

  for (let i = 0; i < graphTxs.length; i++) {
    const tx = graphTxs[i].tx;
    const txId = `tx-${tx.identifier}`;
    const iColN = i * 2;
    const tColN = iColN + 1;
    const oColN = tColN + 1;

    if (!columns[iColN]) columns[iColN] = [];
    if (!columns[tColN]) columns[tColN] = [];
    if (!columns[oColN]) columns[oColN] = [];

    nodes[txId] = {
      id: txId,
      type: 'tx',
      data: tx,
      zIndex: 10,
      initialWidth: GRAPH_NODE_WIDTH,
      initialHeight: GRAPH_TX_NODE_HEIGHT,
      position: {
        x: tColN * COLUMN_WIDTH,
        y: columns[tColN].length * ROW_HEIGHT
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
          initialWidth: GRAPH_NODE_WIDTH,
          initialHeight: GRAPH_UTXO_NODE_HEIGHT,
          position: {
            x: iColN * COLUMN_WIDTH,
            y: columns[iColN].length * ROW_HEIGHT
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
          initialWidth: GRAPH_NODE_WIDTH,
          initialHeight: GRAPH_UTXO_NODE_HEIGHT,
          position: {
            x: oColN * COLUMN_WIDTH,
            y: columns[oColN].length * ROW_HEIGHT
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
          initialWidth: GRAPH_NODE_WIDTH,
          initialHeight: GRAPH_UTXO_NODE_HEIGHT,
          position: {
            x: oColN * COLUMN_WIDTH,
            y: columns[oColN].length * ROW_HEIGHT
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
  modifiedTx: Tx | undefined,
  modifications: Array<TxMod>,
  index: number,
  status: GraphNodeTx['status']
): GraphNodeTx => {
  if (!modifiedTx) return mapTxToGraphTx(tx, index, status);
  
  const graphTx: GraphNodeTx = {
    identifier: tx.id ?? '',
    label: `Transaction #${index + 1}`,
    type: 'tx',
    status,
    inputCount: tx.inputs.length,
    outputCount: tx.outputs.length,
    withdrawalCount: tx.withdrawals.length,
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
  };

  for (const mod of modifications) {
    if (mod.type === 'removeRequiredSigner') {
      graphTx.signers = {
        current: tx.signers?.filter(s => s !== mod.keyHash),
        previous: tx.signers
      };
    }
  }

  return graphTx;
};

const mapTxInputToGraphUTxO = (input: TxInput): GraphNodeUTxO => ({
  identifier: input.utxo,
  label: input.addressLabel ?? input.addressType,
  type: input.addressType === 'script' ? 'script' : 'wallet',
  address: { current: input.address, previous: input.address },
  utxo: { current: input.utxo, previous: input.utxo },
  value: { current: input.value, previous: input.value },
  redeemer: { current: input.redeemerRaw, previous: input.redeemerRaw },
  consumed: false,
});

const mapModifiedTxInputToGraphUTxO = (
  input: TxInput,
  modifiedInput: TxInput | undefined,
  modifications: Array<TxMod>
): GraphNodeUTxO => {
  if (!modifiedInput) return mapTxInputToGraphUTxO(input);
  
  const graphUtxo: GraphNodeUTxO = {
    identifier: input.utxo,
    label: input.addressLabel ?? input.addressType,
    type: input.addressType === 'script' ? 'script' : 'wallet',
    address: {
      current: modifiedInput.address,
      previous: input.address,
    },
    utxo: {
      current: modifiedInput.utxo,
      previous: input.utxo,
    },
    value: {
      current: modifiedInput.value,
      previous: input.value,
    },
    redeemer: {
      current: modifiedInput.redeemerRaw,
      previous: input.redeemerRaw,
    },
    consumed: false,
  };

  for (const mod of modifications) {
    if (mod.type === 'changeInput' && mod.utxo === input.utxo) {
      if (mod.address) {
        graphUtxo.address = {
          current: mod.address,
          previous: input.address
        };
      }
      if (mod.value) {
        graphUtxo.value = {
          current: mod.value,
          previous: input.value
        };
      }
    }
  }

  return graphUtxo;
};

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

const mapModifiedTxOutputToGraphUTxO = (
  output: TxOutput,
  modifiedOutput: TxOutput | undefined,
  modifications: Array<TxMod>
): GraphNodeUTxO => {
  if (!modifiedOutput) return mapTxOutputToGraphUTxO(output);
  
  const graphUtxo: GraphNodeUTxO = {
    identifier: output.utxo,
    label: output.addressLabel ?? output.addressType,
    type: output.addressType === 'script' ? 'script' : 'wallet',
    address: {
      current: modifiedOutput.address,
      previous: output.address,
    },
    utxo: {
      current: modifiedOutput.utxo,
      previous: output.utxo,
    },
    value: {
      current: modifiedOutput.value,
      previous: output.value,
    },
    datum: {
      current: modifiedOutput.datum,
      previous: output.datum,
    },
    consumed: false,
  };

  for (const mod of modifications) {
    if (mod.type === 'changeOutput' && mod.index === output.index) {
      if (mod.address) {
        graphUtxo.address = {
          current: mod.address,
          previous: output.address
        };
      }
      if (mod.value) {
        graphUtxo.value = {
          current: mod.value,
          previous: output.value
        };
      }
      if (mod.datum) {
        graphUtxo.datum = {
          current: mod.datum,
          previous: output.datum
        };
      }
    }
  }

  return graphUtxo;
};

const mapTxWithdrawalToGraphUTxO = (withdrawal: TxWithdrawal): GraphNodeUTxO => ({
  identifier: withdrawal.stakeAddress,
  label: withdrawal.addressLabel ?? 'withdrawal',
  type: 'withdrawal',
  stakeAddress: { current: withdrawal.stakeAddress, previous: withdrawal.stakeAddress },
  redeemer: { current: withdrawal.redeemerRaw, previous: withdrawal.redeemerRaw },
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
    if (mode === 'result-graph' || index < stepIndex) {
      graphTxs.push({
        tx: mapTxToGraphTx(trace.tx, index, 'success'),
        inputs: trace.tx.inputs.map(mapTxInputToGraphUTxO),
        outputs: trace.tx.outputs.map(mapTxOutputToGraphUTxO),
        withdrawals: trace.tx.withdrawals.map(mapTxWithdrawalToGraphUTxO),
      });
    } else {
      graphTxs.push({
        tx: mapModifiedTxToGraphTx(
          trace.tx,
          trace.modifiedTx,
          trace.modifications,
          index,
          trace.modifiedTx && trace.validation?.status !== 'valid' ? 'failure' : 'success'
        ),
        inputs: trace.tx.inputs.map((input, index) => {
          const modifiedInput = trace.modifiedTx?.inputs[index];
          return mapModifiedTxInputToGraphUTxO(input, modifiedInput, trace.modifications);
        }),
        outputs: trace.tx.outputs.map((output, index) => {
          const modifiedOutput = trace.modifiedTx?.outputs[index];
          return mapModifiedTxOutputToGraphUTxO(output, modifiedOutput, trace.modifications);
        }),
        withdrawals: trace.tx.withdrawals.map(mapTxWithdrawalToGraphUTxO),
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
  stepIndex: number,
  onViewDetails: (node: GraphNode) => void
): GraphData => {
  let graphData: GraphData;

  if (round.type === 'positive' || round.type === 'negative') {
    graphData = mapTransitionTestRoundToGraphData(
      round as TransitionTestRound
    );
  } else {
    graphData = mapThreatModelTestRoundToGraphData(
      mode, round as ThreatModelTestRound, stepIndex
    );
  }

  for (const node of Object.values(graphData.nodes)) {
    node.data = { ...node.data, onViewDetails };
  }

  return graphData;
}
