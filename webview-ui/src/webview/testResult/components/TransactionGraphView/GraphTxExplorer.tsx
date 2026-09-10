import { useMemo } from 'react';

import { mapTestRoundToGraphData } from '../../utils/reactFlowMapper';

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
  label: string;
  valid: boolean;
}

interface ExplorerRowProps {
  tx: ExplorerTx;
  selected: boolean;
  onSelect: (nodeId: string) => void;
}

const noop = (): void => {};

const formatTxLabel = (id: string, index: number): string => {
  if (id === '') return `Transaction #${index + 1}`;
  if (id.length <= 8) return `# ${id}`;
  return `# ${id.slice(0, 4)}...${id.slice(-4)}`;
};

const mapRoundToTxs = (mode: GraphMode, round: TestRound, stepIndex: number): Array<ExplorerTx> => {
  const { nodes } = mapTestRoundToGraphData(mode, round, stepIndex, noop);
  return Object.values(nodes)
    .filter(node => node.type === 'tx')
    .map(node => node.data as unknown as GraphNodeTx)
    .sort((a, b) => a.index - b.index)
    .map(data => ({
      nodeId: `tx-${data.id.current}`,
      label: formatTxLabel(data.id.current, data.index),
      valid: data.status === 'success',
    }));
};

const ExplorerRow: React.FC<ExplorerRowProps> = ({ tx, selected, onSelect }) => {
  const handleClick = (): void => {
    onSelect(tx.nodeId);
  };

  return (
    <div className="h-[22px] w-full overflow-clip">
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-1.5 px-3 py-[3px] rounded border-0 cursor-pointer hover:bg-white/10 ${selected ? 'bg-blue-10' : 'bg-transparent'}`}
      >
        <i className={`codicon shrink-0 ${tx.valid ? 'codicon-pass text-green-01' : 'codicon-error text-red-01'}`} />
        <span className="text-base-06 text-[11px] font-medium whitespace-nowrap">
          {tx.label}
        </span>
      </button>
    </div>
  );
};

const GraphTxExplorer: React.FC<Props> = ({ mode, round, stepIndex, selectedNodeId, onSelectTx, onClose }) => {
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

      <div className="flex flex-col gap-0.5 w-full pl-2 flex-1 overflow-y-auto">
        {txs.map(tx =>
          <ExplorerRow
            key={tx.nodeId}
            tx={tx}
            selected={tx.nodeId === selectedNodeId}
            onSelect={onSelectTx}
          />
        )}
      </div>
    </div>
  );
};

export default GraphTxExplorer;
