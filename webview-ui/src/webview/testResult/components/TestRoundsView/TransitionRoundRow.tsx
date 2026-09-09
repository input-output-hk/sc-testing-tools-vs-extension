import { useState } from 'react';

import {
  VscodeTableRow,
  VscodeTableCell
} from '@vscode-elements/react-elements';

import RoundStatusIcon from './RoundStatusIcon';
import TransitionRoundSubTable from './TransitionRoundSubTable';

interface Props {
  index: number;
  round: TransitionTestRound;
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
  roundHasError: boolean;
}

const getRoundStats = (round: TransitionTestRound): RoundStats => {
  let validTxs = 0;
  let invalidTxs = 0;
  let inputs = 0;
  let outputs = 0;
  let mints = 0;

  const roundHasError = round.status.status === 'failure';

  for (const transition of round.transitions) {
    if (transition.tx) {
      if (transition.result.status === 'success') {
        validTxs += 1;
      } else {
        invalidTxs += 1;
      }
      inputs += transition.tx.inputs.length;
      outputs += transition.tx.outputs.length;
      mints += transition.tx.mint ? transition.tx.mint.assets.length : 0;
    }
  }

  return { validTxs, invalidTxs, inputs, outputs, mints, roundHasError };
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

const TransitionRoundRow: React.FC<Props> = ({ index, round, onOpenGraph }) => {
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const { validTxs, invalidTxs, inputs, outputs, mints, roundHasError } = getRoundStats(round);

  const handleOpenRoundGraph = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onOpenGraph(round);
  };

  return (
    <>
      <VscodeTableRow className={index % 2 === 0 ? 'bg-base-19' : 'bg-base-20'}>
        <RoundCell id onClick={() => setCollapsed(!collapsed)}>
          <span>
            <button
              className="py-2 pl-3 pr-0 opacity-40 cursor-pointer"
              onClick={() => setCollapsed(!collapsed)}
            >
              <i className={`translate-y-0.75 codicon ${collapsed ? 'codicon-chevron-right' : 'codicon-chevron-down'}`} />
            </button>
            <RoundStatusIcon roundId={round.id} status={round.status} />
            <button
              className="p-2 text-blue-05 cursor-pointer"
              onClick={handleOpenRoundGraph}
            >
              {round.id}
            </button>
            {roundHasError &&
              <i className="translate-y-0.75 codicon codicon-error text-red-01" />
            }
          </span>
        </RoundCell>
        <RoundCell value={validTxs} />
        <RoundCell>
          <span className={invalidTxs > 0 ? 'text-red-01' : undefined}>
            {invalidTxs}
          </span>
        </RoundCell>
        <RoundCell value={inputs} />
        <RoundCell value={outputs} />
        <RoundCell value={mints} />
      </VscodeTableRow>
      {!collapsed &&
        <VscodeTableRow className={index % 2 === 0 ? 'bg-base-19' : 'bg-base-20'}>
          <td colSpan={6} className="px-3 pb-3">
            <TransitionRoundSubTable round={round} onOpenGraph={onOpenGraph} />
          </td>
        </VscodeTableRow>
      }
    </>
  );
};

export default TransitionRoundRow;
