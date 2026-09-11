import { useMemo } from 'react';
import { VscodeTree, VscodeTreeItem } from '@vscode-elements/react-elements';

import useTreeItemState from '../../../../hooks/useTreeItemState';

interface Props {
  mode: GraphMode;
  round: TestRound;
  stepIndex: number;
  selectedNodeId: string | null;
  onSelectTx: (nodeId: string) => void;
  onClose: () => void;
}

interface ExplorerRowProps {
  tx: ExplorerTx;
  selected: boolean;
  onSelect: (nodeId: string) => void;
}

interface ExplorerTx {
  index: number;
  id: string;
  nodeId: string;
  isValid: boolean;
}

const getTestRoundTxs = (mode: GraphMode, round: TestRound, stepIndex: number): Array<ExplorerTx> => {
  const txs: Array<ExplorerTx> = [];
  if (round.type === 'positive' || round.type === 'negative') {
    for (const [index, transition] of (round as TransitionTestRound).transitions.entries()) {
      if (!transition.tx || !transition.tx.id) continue;
      txs.push({
        index,
        id: transition.tx.id,
        nodeId: `tx-${transition.tx.id}`,
        isValid: transition.result.status === 'success'
      });
    }
  } else {
    for (const [index, trace] of (round as ThreatModelTestRound).traces.entries()) {
      if (!trace.tx || !trace.tx.id || mode === 'attack-timeline' && index > stepIndex) continue;
      const txId = mode === 'result-graph' || mode === 'attack-timeline' && index < stepIndex ? trace.tx.id : trace.modifiedTx?.id ?? trace.tx.id;
      txs.push({
        index,
        id: txId,
        nodeId: `tx-${txId}`,
        isValid: trace.outcome.status === 'passed'
      });
    }
  }
  return txs;
};

const ExplorerRow: React.FC<ExplorerRowProps> = ({ tx, selected, onSelect }) => {
  const treeItemRef = useTreeItemState({
    onToggleSelection: (isSelected) => {
      if (isSelected) onSelect(tx.nodeId);
    },
  });

  return (
    <VscodeTreeItem ref={treeItemRef} selected={selected}>
      <span className="flex items-center gap-1.5 pl-1.5">
        <i className={`codicon shrink-0 ${tx.isValid ? 'codicon-pass text-green-01' : 'codicon-error text-red-01'}`} />
        <span className="flex items-center gap-1 overflow-hidden">
          <span className="text-base-06 text-[11px] font-medium whitespace-nowrap">
            {`Transaction #${tx.index + 1}`}
          </span>
          <span className="text-base-09 text-[11px] font-medium whitespace-nowrap">
            {`${tx.id.slice(0, 4)}...${tx.id.slice(-4)}`}
          </span>
        </span>
      </span>
    </VscodeTreeItem>
  );
};

const GraphExplorer: React.FC<Props> = ({ mode, round, stepIndex, selectedNodeId, onSelectTx, onClose }) => {
  const txs = useMemo(() => getTestRoundTxs(mode, round, stepIndex), [mode, round, stepIndex]);

  return (
    <div className="absolute left-0 top-0 h-full w-90 z-10">
      <div className="flex flex-col shrink-0 w-full h-full border-r border-base-13 backdrop-blur-xs bg-[#252526CC]">
        <div className="flex items-center gap-2 pl-2">
          <button
            type="button" onClick={onClose}
            className="ml-1 pt-1 px-1 rounded-full hover:bg-base-17 active:bg-base-16 cursor-pointer"
          >
            <i className="codicon codicon-arrow-left text-[#FFFFFFCC] active:text-white" />
          </button>
          <div className="flex flex-1 items-center h-10 pr-2 py-2">
            <span className="text-base-06 text-[14px] font-medium">Graph Explorer</span>
          </div>
        </div>

        <div className="h-px w-full bg-base-13" />

        <div className="flex items-center justify-between w-full mb-2 px-4 py-2 border-b border-base-13 text-base-07 text-[11px] font-medium">
          <span>Transactions</span>
          <span>{txs.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <VscodeTree>
            {txs.map(tx =>
              <ExplorerRow
                key={tx.nodeId}
                tx={tx}
                selected={tx.nodeId === selectedNodeId}
                onSelect={onSelectTx}
              />
            )}
          </VscodeTree>
        </div>
      </div>
    </div>
  );
};

export default GraphExplorer;
