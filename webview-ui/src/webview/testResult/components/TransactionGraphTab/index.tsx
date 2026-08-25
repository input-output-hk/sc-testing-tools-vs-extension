import { useState, forwardRef, useImperativeHandle } from 'react';

import Graph from './Graph';
import Toolbar from './Toolbar';

interface Handle {
  showRoundNode: (round: TestRound, nodeId?: string) => void;
}

interface Props {
  test: Test;
  testRounds: Array<TestRound>;
}

const TransactionGraphTab: React.FC<Props & React.RefAttributes<Handle>> = forwardRef<Handle, Props>((props, ref) => {
  const [mode, setMode] = useState<GraphMode>('result-graph');
  const [test, setTest] = useState<Test|null>(null);
  const [testRoundIndex, setTestRoundIndex] = useState<number>(0);
  const [nodeId, setNodeId] = useState<string|null>(null);

  if (test === null || test.id.join(':') != props.test.id.join(':')) {
    setMode('result-graph');
    setTest(props.test);
    setTestRoundIndex(0);
    setNodeId(null);
  }

  const onSelectRound = (index: number, nodeId?: string): void => {
    setMode('result-graph');
    setTestRoundIndex(index);
    setNodeId(nodeId ? nodeId : null);
  };

  useImperativeHandle(ref, () => ({
    showRoundNode: (round: TestRound, nodeId?: string): void =>
      onSelectRound(
        props.testRounds.findIndex(r => r.id === round.id),
        nodeId
      )
    }
  ));

  return (
    <div className="flex flex-col h-full border border-base-14">
      <Toolbar
        mode={mode}
        testRoundIndex={testRoundIndex}
        testRounds={props.testRounds}
        onSelectRound={onSelectRound}
        onSelectMode={setMode}
      />
      <div className="flex-1 relative bg-base-19">
        <Graph
          mode={mode}
          round={props.testRounds[testRoundIndex]}
          nodeId={nodeId || undefined}
          onViewNodeDetails={console.log}
        />
      </div>
    </div>
  );
});

export type { Handle as TransactionGraphTabRef };
export default TransactionGraphTab;
