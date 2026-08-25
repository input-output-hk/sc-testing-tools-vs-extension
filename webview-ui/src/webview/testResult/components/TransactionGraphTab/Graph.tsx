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

const INITIAL_VIEWPORT = { x: 20, y: 20, zoom: 1 };

interface Props {
  mode: GraphMode;
  round: TestRound;
  nodeId?: string;
  onViewNodeDetails: (node: GraphNode) => void;
}

const Graph: React.FC<Props> = ({ round, nodeId, onViewNodeDetails }) => {
  const graphData = mapTestRoundToGraphData(round, onViewNodeDetails);
  const [nodes] = useState<Record<string, Node>>(graphData.nodes);
  const [edges, setEdges] = useState<Record<string, Edge>>(graphData.edges);
  const reactFlowInstance = useRef<ReactFlowInstance>(useReactFlow());

  useEffect(() => {
    if (nodeId === undefined) {
      reactFlowInstance.current?.setViewport(
        INITIAL_VIEWPORT,
        { duration: 300 }
      );
    } else {
      setTimeout(() =>
        reactFlowInstance.current?.fitView({
          nodes: [{ id: nodeId }],
          duration: 300,
          minZoom: 1.25,
          maxZoom: 1.25,
        })
      , 0);
    }
  }, [nodeId]);

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
      defaultViewport={INITIAL_VIEWPORT}
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
    <Graph
      {...props}
      key={props.round.testId.join(':')}
    />
  </ReactFlowProvider>
);

export default GraphWithProvider;
