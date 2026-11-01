import { useState } from 'react';

import {
  VscodeTableRow,
  VscodeTableCell
} from '@vscode-elements/react-elements';

import Tooltip from '../../../../components/Tooltip';
import RoundStatusIcon from './RoundStatusIcon';
import ThreatModelRoundSubTable from './ThreatModelRoundSubTable';

interface Props {
  index: number;
  round: ThreatModelTestRound;
  onOpenGraph: (round: TestRound, nodeId?: string) => void;
}

type RoundCellProps = {
  id?: boolean;
  onClick?: () => void;
} & ({
  value: React.ReactNode;
} | {
  children: React.ReactNode;
});

interface RoundStats {
  validTxs: number;
  invalidTxs: number;
  inputs: number;
  outputs: number;
  mints: number;
  attacks: number;
}

const getRoundStats = (round: ThreatModelTestRound): RoundStats => {
  const validTxs: Set<string> = new Set();
  const invalidTxs: Set<string> = new Set();
  const inputs: Set<string> = new Set();
  const outputs: Set<string> = new Set();
  const mints: Set<string> = new Set();
  const attacks: Set<string> = new Set();

  for (const trace of round.traces) {
    if (trace.tx && trace.tx.id) {
      validTxs.add(trace.tx.id);
      for (const input of trace.tx.inputs) {
        inputs.add(input.utxo);
      }
      for (const output of trace.tx.outputs) {
        outputs.add(output.utxo);
      }
      if (trace.tx.mint) {
        for (const asset of trace.tx.mint.assets) {
          mints.add(`${trace.tx.id}:${asset.policyId}`);
        }
      }
    }
    if (trace.modifiedTx && trace.modifiedTx.id && trace.validation?.status !== 'valid') {
      invalidTxs.add(trace.modifiedTx.id);
    }
    if (trace.modifiedTx && trace.modifiedTx.id) {
      attacks.add(trace.modifiedTx.id);
    }
  }

  return {
    validTxs: validTxs.size,
    invalidTxs: invalidTxs.size,
    inputs: inputs.size,
    outputs: outputs.size,
    mints: mints.size,
    attacks: attacks.size
  };
};

const RoundCell: React.FC<RoundCellProps> = (props: RoundCellProps) => (
  <VscodeTableCell
    className={
      (props.id ? ' text-left p-0' : ' text-center p-2') +
      (props.onClick ? ' cursor-pointer' : '')
    }
    onClick={props.onClick}
  >
    { 'value' in props ? props.value : props.children }
  </VscodeTableCell>
);

const ThreatModelRoundRow: React.FC<Props> = ({ index, round, onOpenGraph }) => {
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const { validTxs, invalidTxs, inputs, outputs, mints, attacks } = getRoundStats(round);
  const rowBackgroundClass = index % 2 === 0 ? 'bg-[var(--vscode-panel-background)]' : 'bg-[var(--vscode-sideBar-background)]';

  const handleOpenRoundGraph = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onOpenGraph(round);
  };

  return (
    <>
      <VscodeTableRow className={rowBackgroundClass}>
        <RoundCell id onClick={() => setCollapsed(!collapsed)}>
          <span>
            <button
              className="py-2 pl-3 pr-0 opacity-40 cursor-pointer"
              onClick={() => setCollapsed(!collapsed)}
              data-tooltip-id="round-row-action"
              data-tooltip-content={collapsed ? 'Expand' : 'Collapse'}
            >
              <i className={`translate-y-0.75 codicon ${collapsed ? 'codicon-chevron-right' : 'codicon-chevron-down'}`} />
            </button>
            <RoundStatusIcon roundId={round.id} status={round.status} />
            <button
              id={`round-graph-${round.id}`}
              className="p-2 text-blue-05 cursor-pointer"
              onClick={handleOpenRoundGraph}
            >
              {round.id}
            </button>
            <Tooltip
              content="View Graph"
              id={`round-graph-${round.id}`}
              place="bottom-start"
              positionStrategy="fixed"
            />
          </span>
        </RoundCell>
        <RoundCell value={validTxs} />
        <RoundCell value={invalidTxs} />
        <RoundCell value={inputs} />
        <RoundCell value={outputs} />
        <RoundCell value={mints} />
        <RoundCell value={attacks} />
      </VscodeTableRow>
      {!collapsed &&
        <VscodeTableRow className={rowBackgroundClass}>
          <td colSpan={7} className="px-3 pb-3">
            <ThreatModelRoundSubTable round={round} onOpenGraph={onOpenGraph} backgroundClass={rowBackgroundClass} />
          </td>
        </VscodeTableRow>
      }
    </>
  );
};

export default ThreatModelRoundRow;
