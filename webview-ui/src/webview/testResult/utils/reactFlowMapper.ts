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
    const txId = `tx-${tx.id.current}`;
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
      const utxoId = `utxo-${graphTxs[i].inputs[j].utxo.current}`;
      if (nodes[utxoId] !== undefined) {
        nodes[utxoId]['data'] = {
          ...nodes[utxoId]['data'],
          ...graphTxs[i].inputs[j],
          consumed: true,
        };
      } else {
        nodes[utxoId] = {
          id: utxoId,
          type: 'utxo',
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
      } as Edge;
    }

    for (let j = 0; j < graphTxs[i].outputs.length; j++) {
      const txHandler = `${txId}-o-${j}`;
      const utxoId = `utxo-${graphTxs[i].outputs[j].utxo.current}`;
      if (nodes[utxoId] !== undefined) {
        nodes[utxoId]['data'] = {
          ...nodes[utxoId]['data'],
          ...graphTxs[i].outputs[j],
          consumed: nodes[utxoId]['data'].consumed,
        };
      } else {
        nodes[utxoId] = {
          id: utxoId,
          type: 'utxo',
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

const mapTxToGraphTx = (tx: Tx, index: number, mode: GraphMode, status: GraphNodeTx['status']): GraphNodeTx => ({
  type: 'tx', index, mode, status,
  id: { current: tx.id ?? '', previous: tx.id ?? '' },
  fee: { current: tx.fee, previous: tx.fee },
  signers: { current: tx.signers, previous: tx.signers },
  mint: { current: tx.mint, previous: tx.mint },
  inputCount: tx.inputs.length,
  outputCount: tx.outputs.length,
});

const mapModifiedTxToGraphTx = (
  tx: Tx,
  modifiedTx: Tx | undefined,
  modifications: Array<TxMod>,
  index: number,
  mode: GraphMode,
  status: GraphNodeTx['status']
): GraphNodeTx => {
  if (!modifiedTx) return mapTxToGraphTx(tx, index, mode, status);
  
  const graphTx: GraphNodeTx = {
    type: 'tx', index, mode, status,
    inputCount: tx.inputs.length,
    outputCount: tx.outputs.length,
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

const mapTxInputToGraphUTxO = (input: TxInput, index: number, mode: GraphMode): GraphNodeUTxO => ({
  type: 'utxo', index, mode, consumed: false,
  address: { current: input.address, previous: input.address },
  utxo: { current: input.utxo, previous: input.utxo },
  value: { current: input.value, previous: input.value },
  redeemer: { current: input.redeemerRaw, previous: input.redeemerRaw },
});

const mapModifiedTxInputToGraphUTxO = (
  input: TxInput,
  modifiedInput: TxInput | undefined,
  modifications: Array<TxMod>,
  index: number,
  mode: GraphMode
): GraphNodeUTxO => {
  if (!modifiedInput) return mapTxInputToGraphUTxO(input, index, mode);
  
  const graphUtxo: GraphNodeUTxO = {
    type: 'utxo', index, mode, consumed: false,
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

const mapTxOutputToGraphUTxO = (output: TxOutput, mode: GraphMode): GraphNodeUTxO => ({
  type: 'utxo', index: output.index, mode, consumed: false,
  address: { current: output.address, previous: output.address },
  utxo: { current: output.utxo, previous: output.utxo },
  value: { current: output.value, previous: output.value },
  datum: { current: output.datum, previous: output.datum },
});

const mapModifiedTxOutputToGraphUTxO = (
  output: TxOutput,
  modifiedOutput: TxOutput | undefined,
  modifications: Array<TxMod>,
  mode: GraphMode
): GraphNodeUTxO => {
  if (!modifiedOutput) return mapTxOutputToGraphUTxO(output, mode);
  
  const graphUtxo: GraphNodeUTxO = {
    type: 'utxo', index: output.index, mode, consumed: false,
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

const mapTransitionTestRoundToGraphData = (mode: GraphMode, round: TransitionTestRound): GraphData => {
  const graphTxs: Array<GraphTx> = [];
  const stepNodes: Array<string> = [];

  for (const [index, transition] of round.transitions.entries()) {
    if (!transition.tx) continue;
    graphTxs.push({
      tx: mapTxToGraphTx(transition.tx, index, mode, transition.result.status),
      inputs: transition.tx.inputs.map((input, index) => mapTxInputToGraphUTxO(input, index, mode)),
      outputs: transition.tx.outputs.map(output => mapTxOutputToGraphUTxO(output, mode)),
    });
  }

  if (graphTxs.length > 0) {
    stepNodes.push(...[
      `tx-${graphTxs[0].tx.id.current}`,
      ...graphTxs[0].inputs.map(({ utxo }) => `utxo-${utxo.current}`),
      ...graphTxs[0].outputs.map(({ utxo }) => `utxo-${utxo.current}`)
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
    const status: GraphNodeTx['status'] = trace.outcome.status === 'passed' ? 'success' : 'failure';
    if (mode === 'result-graph' || index < stepIndex) {
      graphTxs.push({
        tx: mapTxToGraphTx(trace.tx, index, mode, status),
        inputs: trace.tx.inputs.map((input, index) => mapTxInputToGraphUTxO(input, index, mode)),
        outputs: trace.tx.outputs.map(output => mapTxOutputToGraphUTxO(output, mode)),
      });
    } else {
      graphTxs.push({
        tx: mapModifiedTxToGraphTx(
          trace.tx, trace.modifiedTx, trace.modifications,
          index, mode, status,
        ),
        inputs: trace.tx.inputs.map((input, index) => {
          const modifiedInput = trace.modifiedTx?.inputs[index];
          return mapModifiedTxInputToGraphUTxO(input, modifiedInput, trace.modifications, index, mode);
        }),
        outputs: trace.tx.outputs.map((output, index) => {
          const modifiedOutput = trace.modifiedTx?.outputs[index];
          return mapModifiedTxOutputToGraphUTxO(output, modifiedOutput, trace.modifications, mode);
        }),
      });
    }
  }

  if (graphTxs.length > 0) {
    const index = graphTxs.length > stepIndex ? stepIndex : 0;
    stepNodes.push(...[
      `tx-${graphTxs[index].tx.id.current}`,
      ...graphTxs[index].inputs.map(({ utxo }) => `utxo-${utxo.current}`),
      ...graphTxs[index].outputs.map(({ utxo }) => `utxo-${utxo.current}`)
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
      mode, round as TransitionTestRound
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