import { useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useReactFlow,
} from '@xyflow/react';

import GraphNode from './GraphNode';
import MiniMapNode from './MiniMapNode';

import { mapTestRoundToGraphData } from '../../utils/reactFlowMapper';

import type { Node, Edge, ReactFlowInstance } from '@xyflow/react';

import "@xyflow/react/dist/style.css";

interface Props {
  mode: GraphMode;
  trace: number;
  round: TestRound;
  nodeId?: string;
  onViewNodeDetails: (node: GraphNode) => void;
  isActive: boolean;
}

const Graph: React.FC<Props> = (props) => {
  const [mode, setMode] = useState<GraphMode | null>(null);
  const [trace, setTrace] = useState<number | null>(null);
  const [round, setRound] = useState<TestRound | null>(null);

  const [nodes, setNodes] = useState<Record<string, Node>>({});
  const [edges, setEdges] = useState<Record<string, Edge>>({});
  const [diff, setDiff] = useState<Array<string> | null>(null);
  const reactFlowInstance = useRef<ReactFlowInstance>(useReactFlow());

  if (round === null || round !== props.round || mode !== props.mode || trace !== props.trace) {
    const graphData = mapTestRoundToGraphData(
      props.mode,
      props.trace,
      props.round,
      props.onViewNodeDetails
    );
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
    setDiff(graphData.diff || null);
    setMode(props.mode);
    setRound(props.round);
    setTrace(props.trace);
  }

  useEffect(() => {
    if (props.isActive) {
      const nodes: Array<string> | null = props.nodeId ? [props.nodeId] : diff; 
      if (nodes !== null && nodes.length > 0) {
        requestAnimationFrame(() =>
          reactFlowInstance.current?.fitView({
            nodes: nodes.map(id => ({ id })),
            duration: 300,
            minZoom: 0.5,
            maxZoom: 1.0,
          })
        );
      }
    }
  }, [props.isActive, props.nodeId, diff]);

  const onActiveEdge = (edgeId: string): void => {
    setEdges(oldEdges => ({
      ...oldEdges,
      [edgeId]: {
        ...oldEdges[edgeId],
        zIndex: 1,
        style: { stroke: '#BBB' }
      }
    }));
  };

  const onInactiveEdge = (edgeId: string): void => {
    setEdges(oldEdges => ({
      ...oldEdges,
      [edgeId]: {
        ...oldEdges[edgeId],
        zIndex: undefined,
        style: {}
      }
    }));
  };

  return (
    <ReactFlow
      colorMode="dark"
      nodes={Object.values(nodes)}
      edges={Object.values(edges)}
      nodeTypes={{ tx: GraphNode, utxo: GraphNode }}
      onEdgeMouseEnter={(_, edge) => onActiveEdge(edge.id)}
      onEdgeMouseLeave={(_, edge) => onInactiveEdge(edge.id)}
    >
      <MiniMap
        pannable={true}
        bgColor="rgba(60, 60, 60, 0.9)"
        maskColor="rgba(40, 40, 40, 0.6)"
        nodeColor={node => node.type === 'tx' ? '#73C991' : '#569CD6'}
        nodeComponent={MiniMapNode}
      />
      <Controls showInteractive={false} />
      <Background bgColor="#1E1E1E" color="#333333" />
    </ReactFlow>
  );
};

const GraphWithProvider: React.FC<Props> = (props) => (
  <ReactFlowProvider>
    <Graph {...props} />
  </ReactFlowProvider>
);

export default GraphWithProvider;
