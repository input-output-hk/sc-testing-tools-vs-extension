import { useState, forwardRef, useImperativeHandle } from 'react';

import Toolbar from './Toolbar';
import Graph from './Graph';
import GraphTimeline from './GraphTimeline';
import GraphExplorer from './GraphExplorer';

interface Handle {
  showRoundNode: (round: TestRound, nodeId?: string) => void;
}

interface Props {
  test: Test;
  testRounds: Array<TestRound>;
  isActive: boolean;
}

const TransactionGraphView: React.FC<Props & React.RefAttributes<Handle>> = forwardRef<Handle, Props>((props, ref) => {
  const [mode, setMode] = useState<GraphMode>('result-graph');
  const [test, setTest] = useState<Test|null>(null);
  const [testRoundIndex, setTestRoundIndex] = useState<number>(0);
  const [nodeId, setNodeId] = useState<string|null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [explorerOpen, setExplorerOpen] = useState<boolean>(false);

  if (test === null || test.id.join(':') != props.test.id.join(':')) {
    setMode('result-graph');
    setTest(props.test);
    setTestRoundIndex(0);
    setNodeId(null);
    setStepIndex(0);
    setExplorerOpen(false);
  }

  const onSelectRound = (index: number, nodeId?: string): void => {
    setTestRoundIndex(index);
    setNodeId(nodeId ? nodeId : null);
    setStepIndex(0);
  };

  const onSelectMode = (newMode: GraphMode): void => {
    setMode(newMode);
    setNodeId(null);
  };

  const onSelectStep = (index: number): void => {
    setStepIndex(index);
    setNodeId(null);
  };

  const onSelectTx = (txNodeId: string): void => {
    setNodeId(txNodeId);
  };

  const onToggleExplorer = (): void => {
    setExplorerOpen(open => !open);
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
    <div className="relative flex flex-col h-full border border-base-14">
      {explorerOpen &&
        <GraphExplorer
          mode={mode}
          round={props.testRounds[testRoundIndex]}
          stepIndex={stepIndex}
          selectedNodeId={nodeId}
          onSelectTx={onSelectTx}
          onClose={onToggleExplorer}
        />
      }
      <Toolbar
        mode={mode}
        testRoundIndex={testRoundIndex}
        testRounds={props.testRounds}
        onSelectRound={onSelectRound}
        onSelectMode={onSelectMode}
        onOpenExplorer={onToggleExplorer}
      />
      <div className="flex-1 flex flex-row bg-base-19">
        <div className="flex-1 relative">
          {mode === 'attack-timeline' &&
            <GraphTimeline
              stepIndex={stepIndex}
              round={props.testRounds[testRoundIndex] as ThreatModelTestRound}
              onSelectStep={onSelectStep}
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
    </div>
  );
});

export type { Handle as TransactionGraphViewRef };
export default TransactionGraphView;
