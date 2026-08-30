import { useState, forwardRef, useImperativeHandle } from 'react';

import Toolbar from './Toolbar';
import GraphTimeline from './GraphTimeline';
import Graph from './Graph';

interface Handle {
  showRoundNode: (round: TestRound, nodeId?: string) => void;
}

interface Props {
  test: Test;
  testRounds: Array<TestRound>;
  isActive: boolean;
}

const TransactionGraphTab: React.FC<Props & React.RefAttributes<Handle>> = forwardRef<Handle, Props>((props, ref) => {
  const [mode, setMode] = useState<GraphMode>('result-graph');
  const [test, setTest] = useState<Test|null>(null);
  const [testRoundIndex, setTestRoundIndex] = useState<number>(0);
  const [nodeId, setNodeId] = useState<string|null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);

  if (test === null || test.id.join(':') != props.test.id.join(':')) {
    setMode('result-graph');
    setTest(props.test);
    setTestRoundIndex(0);
    setNodeId(null);
    setStepIndex(0);
  }

  const onSelectRound = (index: number, nodeId?: string): void => {
    setTestRoundIndex(index);
    setNodeId(nodeId ? nodeId : null);
    setStepIndex(0);
  };

  const onSelectMode = (newMode: GraphMode): void => {
    setMode(newMode);
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
        onSelectMode={onSelectMode}
      />
      <div className="flex-1 relative bg-base-19">
        {mode === 'attack-timeline' &&
          <GraphTimeline
            stepIndex={stepIndex}
            round={props.testRounds[testRoundIndex] as ThreatModelTestRound}
            onSelectStep={setStepIndex}
          />
        }
        <Graph
          mode={mode}
          round={props.testRounds[testRoundIndex]}
          nodeId={nodeId || undefined}
          stepIndex={stepIndex}
          onViewNodeDetails={console.log}
          isActive={props.isActive}
        />
      </div>
    </div>
  );
});

export type { Handle as TransactionGraphTabRef };
export default TransactionGraphTab;
