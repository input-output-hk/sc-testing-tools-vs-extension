import { useState, forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useReactFlow
} from '@xyflow/react';

import Toolbar from './Toolbar';
import GraphNode from './GraphNode';
import MiniMapNode from './MiniMapNode';

import { mapTestRoundToGraphData } from '../../utils/reactFlowMapper';

import "@xyflow/react/dist/style.css";

const INITIAL_VIEWPORT = { x: 20, y: 20, zoom: 1 };

interface Handle {
  selectRound: (round: TestRound) => void;
  selectTx: (round: TestRound, txId: string, txType?: TxType) => void;
}

interface Props {
  test: Test;
  testRounds: Array<TestRound>;
}

const TransactionGraphView: React.FC<Props & React.RefAttributes<Handle>> = forwardRef<Handle, Props>(({ testRounds }, ref) => {
  const [txType, setTxType] = useState<TxType>('original');
  const [selectedRound, setSelectedRound] = useState<TestRound>(testRounds[0]);
  const reactFlowInstance = useReactFlow();

  const onSelectRound = (round: TestRound): void => {
    setTxType('original');
    setSelectedRound(round);
    reactFlowInstance.setViewport(INITIAL_VIEWPORT, { duration: 300 });
  };

  const onSelectTx = (round: TestRound, txId: string, txType?: TxType): void => {
    setSelectedRound(round);
    if (txType) setTxType(txType);
    setTimeout(() =>
      reactFlowInstance.fitView({
        nodes: [{ id: `tx-${txId}` }],
        duration: 300,
        minZoom: 1.25,
        maxZoom: 1.25,
      })
    , 0);
  };

  const onSelectTxType = (type: TxType): void => {
    setTxType(type);
    reactFlowInstance.setViewport(INITIAL_VIEWPORT, { duration: 300 });
  };

  const onViewDetails = (node: GraphNode): void => {
    console.log(node);
  };

  useImperativeHandle(ref, () => ({
    selectRound: onSelectRound,
    selectTx: onSelectTx,
  }));

  const { nodes, edges } = mapTestRoundToGraphData(selectedRound, txType, onViewDetails);

  return (
    <div className="flex flex-col h-full border border-base-14">
      <Toolbar
        testRounds={testRounds}
        selectedRound={selectedRound}
        onRoundChange={onSelectRound}
        txType={txType}
        onSelectTxType={onSelectTxType}
      />
      <div className="flex-1 bg-base-19">
        <ReactFlow
          colorMode="dark"
          nodes={nodes}
          edges={edges}
          nodeTypes={{ tx: GraphNode, utxo: GraphNode }}
          defaultEdgeOptions={{ style: { stroke: '#CCCCCC' } }}
          defaultViewport={INITIAL_VIEWPORT}
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

const TransactionGraphViewWithProvider: React.FC<Props & React.RefAttributes<Handle>> = (props) => (
  <ReactFlowProvider>
    <TransactionGraphView
      {...props}
      key={props.test.id.join(':')}
    />
  </ReactFlowProvider>
);

export type { Handle as TransactionGraphViewRef };
export default TransactionGraphViewWithProvider;
