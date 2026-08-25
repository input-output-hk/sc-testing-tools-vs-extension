import { useState, forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  type Node,
  type Edge
} from '@xyflow/react';

import Toolbar from './Toolbar';
import GraphNode from './GraphNode';
import MiniMapNode from './MiniMapNode';

import { mapTestRoundToGraphData } from '../../utils/reactFlowMapper';

import "@xyflow/react/dist/style.css";

const INITIAL_VIEWPORT = { x: 20, y: 20, zoom: 1 };

interface Handle {
  showRoundNode: (round: TestRound, nodeId?: string) => void;
}

interface Props {
  test: Test;
  testRounds: Array<TestRound>;
}

const TransactionGraphTab: React.FC<Props & React.RefAttributes<Handle>> = forwardRef<Handle, Props>(({ testRounds }, ref) => {
  const [mode, setMode] = useState<GraphMode>('result-graph');
  const [selectedRound, setSelectedRound] = useState<TestRound>(testRounds[0]);
  const reactFlowInstance = useReactFlow();

  const onViewDetails = (node: GraphNode): void => {
    console.log(node);
  };

  const graphData = mapTestRoundToGraphData(selectedRound, onViewDetails);
  const [nodes, setNodes] = useState<Record<string, Node>>(graphData.nodes);
  const [edges, setEdges] = useState<Record<string, Edge>>(graphData.edges);

  const onSelectRound = (round: TestRound): void => {
    setMode('result-graph');
    setSelectedRound(round);

    const graphData = mapTestRoundToGraphData(round, onViewDetails);
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
  };

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

  const onShowRoundNode = (round: TestRound, nodeId?: string): void => {
    onSelectRound(round);
    if (nodeId === undefined) {
      reactFlowInstance.setViewport(
        INITIAL_VIEWPORT,
        { duration: 300 }
      );
    } else {
      setTimeout(() =>
        reactFlowInstance.fitView({
          nodes: [{ id: nodeId }],
          duration: 300,
          minZoom: 1.25,
          maxZoom: 1.25,
        })
      , 0);
    }
  };

  useImperativeHandle(ref, () => ({
    showRoundNode: onShowRoundNode
  }));

  return (
    <div className="flex flex-col h-full border border-base-14">
      <Toolbar
        mode={mode}
        testRounds={testRounds}
        selectedRound={selectedRound}
        onRoundChange={onSelectRound}
        onSelectMode={setMode}
      />
      <div className="flex-1 relative bg-base-19">
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
      </div>
    </div>
  );
});

const TransactionGraphTabWithProvider: React.FC<Props & React.RefAttributes<Handle>> = (props) => (
  <ReactFlowProvider>
    <TransactionGraphTab
      {...props}
      key={props.test.id.join(':')}
    />
  </ReactFlowProvider>
);

export type { Handle as TransactionGraphTabRef };
export default TransactionGraphTabWithProvider;
