import { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import Toolbar from './Toolbar';
import Graph from './Graph';
import GraphTimeline from './GraphTimeline';
import GraphExplorer from './GraphExplorer';
import Tooltip from '../../../../components/Tooltip';
import { mapTestRoundToGraphData } from '../../utils/reactFlowUtils';

interface Handle {
  showRoundNode: (round: TestRound, nodeId?: string) => void;
}
interface Props {
  test: Test;
  testRounds: Array<TestRound>;
  isActive: boolean;
}

const TransactionGraphView = forwardRef<Handle, Props>((props, ref) => {
  const [mode, setMode] = useState<GraphMode>('result-graph');
  const [snapshot, setSnapshot] = useState<GraphSnapshot>('modified');
  const [testId, setTestId] = useState(props.test.id.join(':'));
  const [testRoundIndex, setTestRoundIndex] = useState(0);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [explorerOpen, setExplorerOpen] = useState(false);

  if (testId !== props.test.id.join(':')) {
    setTestId(props.test.id.join(':'));
    setMode('result-graph'); setSnapshot('modified'); setTestRoundIndex(0);
    setNodeId(null); setStepIndex(0); setExplorerOpen(false);
  }
  const roundIndex = Math.min(testRoundIndex, Math.max(0, props.testRounds.length - 1));
  const round = props.testRounds[roundIndex];
  const isTimeline = mode === 'attack-timeline' && round?.type === 'threat-model';
  const selectedStep = isTimeline
    ? Math.min(stepIndex, Math.max(0, (round as ThreatModelTestRound).traces.length - 1)) : 0;
  const graphData = useMemo(() => round
    ? mapTestRoundToGraphData(isTimeline ? 'attack-timeline' : 'result-graph', round, selectedStep, snapshot)
    : null, [round, isTimeline, selectedStep, snapshot]);

  const onSelectRound = (index: number, target?: string) => {
    setTestRoundIndex(index); setStepIndex(0); setSnapshot('modified'); setNodeId(target ?? null);
  };
  useImperativeHandle(ref, () => ({
    showRoundNode: (requestedRound, target) => {
      const index = props.testRounds.findIndex(r => r.id === requestedRound.id);
      if (index < 0) return;
      setMode('result-graph');
      onSelectRound(index, target);
    },
  }));
  if (!round || !graphData) return <p className="p-4">No transactions available</p>;

  return (
    <div className="relative flex flex-col h-full border border-[var(--vscode-sideBar-border)]">
      {explorerOpen && <GraphExplorer txs={graphData.transactions} selectedNodeId={nodeId}
        onSelectTx={setNodeId} onClose={() => setExplorerOpen(false)} />}
      <Toolbar mode={isTimeline ? 'attack-timeline' : 'result-graph'} testRoundIndex={roundIndex}
        testRounds={props.testRounds} onSelectRound={onSelectRound}
        onSelectMode={value => { setMode(value); setNodeId(null); }}
        onOpenExplorer={() => setExplorerOpen(open => !open)} />
      {isTimeline ? <GraphTimeline stepIndex={selectedStep} round={round as ThreatModelTestRound}
        snapshot={snapshot} onSelectSnapshot={value => { setSnapshot(value); setNodeId(null); }}
        onSelectStep={value => { setStepIndex(value); setNodeId(null); }} />
        : round.type === 'threat-model' && <p className="px-3 py-1 text-xs">Original transactions</p>}
      <div className="flex-1 min-h-0 relative bg-[var(--vscode-panel-background)]">
        {graphData.nodes.length === 0 ? <p className="p-4">No transactions available</p>
          : <Graph graphData={graphData} nodeId={nodeId ?? undefined} isActive={props.isActive} />}
      </div>
      <Tooltip id="graph-toolbar-action" place="bottom" />
      <Tooltip id="graph-node-action" place="top" />
    </div>
  );
});
export type { Handle as TransactionGraphViewRef };
export default TransactionGraphView;
