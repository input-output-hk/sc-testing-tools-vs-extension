import { useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  useNodesInitialized,
  useNodesState,
  useEdgesState
} from '@xyflow/react';

import GraphNode from './GraphNode';
import MiniMapNode from './MiniMapNode';

import {
  mapTestRoundToGraphData,
  applyMeasuredLayout,
  resolveNodeCollisions
} from '../../utils/reactFlowUtils';

import type { Node, Edge, OnNodeDrag } from '@xyflow/react';

import "@xyflow/react/dist/style.css";

interface Props {
  mode: GraphMode;
  round: TestRound;
  nodeId?: string;
  stepIndex: number;
  isActive: boolean;
}

const mapNodeToColor = (node: Node): string => {
  switch (node.type) {
    case 'tx':
      return '#73C991';
    case 'wallet':
      return '#569CD6';
    case 'script':
      return '#72642A';
    case 'withdrawal':
      return '#68217A';
    default:
      return '#FFFFFF';
  }
};

const Graph: React.FC<Props> = (props) => {
  const [mode, setMode] = useState<GraphMode | null>(null);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [round, setRound] = useState<TestRound | null>(null);
  const [stepNodes, setStepNodes] = useState<Array<string> | null>(null);
  const [layouted, setLayouted] = useState<boolean>(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowInstance = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  if (round === null || round !== props.round || mode !== props.mode || stepIndex !== props.stepIndex) {
    const graphData = mapTestRoundToGraphData(props.mode, props.round, props.stepIndex);
    setNodes(Object.values(graphData.nodes));
    setEdges(Object.values(graphData.edges));
    setStepNodes(graphData.stepNodes);
    setMode(props.mode);
    setRound(props.round);
    setStepIndex(props.stepIndex);
    setLayouted(false);
  }

  useEffect(() => {
    if (nodesInitialized && !layouted) {
      const measuredNodes = reactFlowInstance.getNodes();

      if (
        measuredNodes.length !== nodes.length ||
        measuredNodes.some(node => !nodes.some(currentNode => currentNode.id === node.id) || !node.measured?.width || !node.measured?.height)
      ) {
        return;
      }

      const positions = applyMeasuredLayout(measuredNodes);
      const animationFrame = requestAnimationFrame(() => {
        setLayouted(true);
        setNodes(currentNodes => currentNodes.map(node => ({
          ...node,
          position: positions[node.id] ?? node.position,
        })));
      });

      return () => cancelAnimationFrame(animationFrame);
    }
  }, [nodesInitialized, layouted, nodes, reactFlowInstance, setNodes]);

  useEffect(() => {
    if (props.isActive && layouted) {
      const nodes: Array<string> | null = props.nodeId ? [props.nodeId] : stepNodes; 
      if (nodes !== null && nodes.length > 0) {
        setTimeout(() =>
          reactFlowInstance.fitView({
            nodes: nodes.map(id => ({ id })),
            duration: 300,
            minZoom: 0.5,
            maxZoom: 1.0,
          })
        );
      }
    }
  }, [props.isActive, props.nodeId, layouted, stepNodes, reactFlowInstance]);

  const onActiveEdge = (edgeId: string): void => {
    setEdges(oldEdges => oldEdges.map(edge =>
      edge.id === edgeId ? {
        ...edge,
        zIndex: 1,
        style: {
          ...edge.style,
          stroke: '#BBB'
        }
      } : edge
    ));
  };

  const onInactiveEdge = (edgeId: string): void => {
    setEdges(oldEdges => oldEdges.map(edge =>
      edge.id === edgeId ? {
        ...edge,
        zIndex: undefined,
        style: {
          ...edge.style,
          stroke: undefined
        }
      } : edge
    ));
  };

  const onNodeDrag: OnNodeDrag<Node> = (_, draggedNode) => {
    setNodes(currentNodes => resolveNodeCollisions(
      currentNodes.map(node => node.id === draggedNode.id ? {
        ...node,
        position: draggedNode.position,
      } : node)
    ));
  };

  return (
    <ReactFlow
      colorMode="dark"
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDrag={onNodeDrag}
      onEdgeMouseEnter={(_, edge) => onActiveEdge(edge.id)}
      onEdgeMouseLeave={(_, edge) => onInactiveEdge(edge.id)}
      nodeTypes={{ tx: GraphNode, wallet: GraphNode, script: GraphNode, withdrawal: GraphNode }}
    >
      <MiniMap
        pannable={true}
        bgColor="rgba(60, 60, 60, 0.9)"
        maskColor="rgba(40, 40, 40, 0.6)"
        nodeColor={mapNodeToColor}
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
