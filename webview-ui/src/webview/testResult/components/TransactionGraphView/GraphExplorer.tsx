import { useMemo } from 'react';
import { VscodeTree, VscodeTreeItem } from '@vscode-elements/react-elements';

import { mapTestRoundToGraphData } from '../../utils/reactFlowMapper';
import useTreeItemState from '../../../../hooks/useTreeItemState';

interface Props {
  mode: GraphMode;
  round: TestRound;
  stepIndex: number;
  selectedNodeId: string | null;
  onSelectTx: (nodeId: string) => void;
  onClose: () => void;
}

interface ExplorerTx {
  nodeId: string;
  indexLabel: string;
  idLabel: string;
  valid: boolean;
}

interface ExplorerRowProps {
  tx: ExplorerTx;
  selected: boolean;
  onSelect: (nodeId: string) => void;
}

const noop = (): void => {};

const formatTxIndexLabel = (index: number): string => `Transaction #${index + 1}`;

const formatTxIdLabel = (id: string): string => {
  if (id === '') return '';
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
};

const mapRoundToTxs = (mode: GraphMode, round: TestRound, stepIndex: number): Array<ExplorerTx> => {
  const { nodes } = mapTestRoundToGraphData(mode, round, stepIndex, noop);
  return Object.values(nodes)
    .filter(node => node.type === 'tx')
    .map(node => node.data as unknown as GraphNodeTx)
    .sort((a, b) => a.index - b.index)
    .map(data => ({
      nodeId: `tx-${data.id.current}`,
      indexLabel: formatTxIndexLabel(data.index),
      idLabel: formatTxIdLabel(data.id.current),
      valid: data.status === 'success',
    }));
};

const ExplorerRow: React.FC<ExplorerRowProps> = ({ tx, selected, onSelect }) => {
  const treeItemRef = useTreeItemState({
    onToggleSelection: (isSelected) => {
      if (isSelected) onSelect(tx.nodeId);
    },
  });

  return (
    <VscodeTreeItem ref={treeItemRef} selected={selected}>
      <i className={`codicon shrink-0 ${tx.valid ? 'codicon-pass text-green-01' : 'codicon-error text-red-01'}`} />
      <span className="flex items-center gap-1 overflow-hidden">
        <span className="text-base-06 text-[11px] font-medium whitespace-nowrap">
          {tx.indexLabel}
        </span>
        {tx.idLabel &&
          <span className="text-base-09 text-[11px] font-medium whitespace-nowrap">
            {tx.idLabel}
          </span>
        }
      </span>
    </VscodeTreeItem>
  );
};

const GraphExplorer: React.FC<Props> = ({ mode, round, stepIndex, selectedNodeId, onSelectTx, onClose }) => {
  const txs = useMemo(() => mapRoundToTxs(mode, round, stepIndex), [mode, round, stepIndex]);

  const handleClose = (): void => {
    onClose();
  };

  return (
    <div className="flex flex-col shrink-0 w-[371px] h-full pb-4 bg-base-19 border-r border-base-17">
      <div className="flex items-center gap-2 pl-2">
        <button
          type="button"
          onClick={handleClose}
          className="p-[3px] rounded-full border-0 bg-transparent hover:bg-base-17 active:bg-base-16 cursor-pointer"
        >
          <i className="codicon codicon-arrow-left text-base-06" />
        </button>
        <div className="flex flex-1 items-center h-10 pr-2 py-2">
          <span className="text-base-06 text-[14px] font-medium">Graph Explorer</span>
        </div>
      </div>

      <div className="h-px w-full bg-base-13" />

      <div className="flex items-center justify-between w-full px-4 py-2 border-b border-base-13 text-base-07 text-[11px] font-medium">
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
  );
};

export default GraphExplorer;
