import { useState } from 'react';

import {
  VscodeTabs,
  VscodeTabHeader,
  VscodeTabPanel,
  VscodeTable,
  VscodeTableHeader,
  VscodeTableHeaderCell,
  VscodeTableBody,
  VscodeTableRow,
  VscodeTableCell
} from '@vscode-elements/react-elements';

interface Props {
  test: Test;
  testRounds: Array<TestRound>;
}

interface RoundRowProps {
  index: number;
  round: TestRound;
}

type RoundCellProps = {
  id?: boolean;
  onClick?: () => void;
} & ({
  value: React.ReactNode;
} | {
  children: React.ReactNode;
});

interface RoundTableProps {
  round: TestRound;
}

interface RoundStats {
  transactions: number;
  inputs: number;
  outputs: number;
  mints: number;
  roundHasError: boolean;
  txHasError: boolean;
}

const getRoundStats = (round: TestRound): RoundStats => {
  let transactions = 0;
  let inputs = 0;
  let outputs = 0;
  let mints = 0;

  const roundHasError = round.status.status === 'failure';
  let txHasError = false;

  for (const transition of round.transitions) {
    if (transition.tx) {
      transactions += 1;
      inputs += transition.tx.inputs.length;
      outputs += transition.tx.outputs.length;
      mints += transition.tx.mint ? transition.tx.mint.assets.length : 0;

      if (!txHasError && transition.result.status === 'failure') {
        txHasError = true;
      }
    }
  }

  return { transactions, inputs, outputs, mints, roundHasError, txHasError };
};

const txValueToString = (value: TxValue): string => {
  const parts: string[] = [];
  if (value.lovelace > 0) {
    parts.push(`${value.lovelace} lovelace`);
  }
  for (const asset of value.assets) {
    parts.push(`${asset.quantity} ${asset.name}`);
  }
  return parts.join(', ');
};

const TableHeader: React.FC = () => (
  <VscodeTableHeader slot="header" className="bg-base-20">
    {['Rounds', 'Transactions', 'Inputs', 'Outputs', 'Mints'].map(column => (
      <VscodeTableHeaderCell key={column} className="p-3 border border-base-14 text-center">
        {column}
      </VscodeTableHeaderCell>
    ))}
  </VscodeTableHeader>
);

const TableBody: React.FC<Props> = ({ testRounds }) => (
  <VscodeTableBody slot="body" className="flex-1 min-h-0 overflow-y-auto border-b border-x border-b-base-14 border-x-base-14">
    {testRounds.sort((a, b) => a.id - b.id).map((round, index) =>
      <RoundRow key={index} index={index} round={round} />
    )}
  </VscodeTableBody>
);

const RoundRow: React.FC<RoundRowProps> = ({ index, round }) => {
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const { transactions, inputs, outputs, mints, roundHasError, txHasError } = getRoundStats(round);

  const handleOpenRoundGraph = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();

  };

  return (
    <>
      <VscodeTableRow className={index % 2 === 0 ? 'bg-base-19' : 'bg-base-20'}>
        <RoundCell id onClick={() => setCollapsed(!collapsed)}>
          <span>
            <button
              className="py-3 pl-3 pr-0 opacity-40 cursor-pointer"
              onClick={() => setCollapsed(!collapsed)}
            >
              <i className={`translate-y-0.75 codicon ${collapsed ? 'codicon-chevron-right' : 'codicon-chevron-down'}`} />
            </button>
            <button
              className="p-3 text-blue-05 cursor-pointer"
              onClick={handleOpenRoundGraph}
            >
              {round.id}
            </button>
            {roundHasError &&
              <i className="translate-y-0.75 codicon codicon-error text-red-01" />
            }
          </span>
        </RoundCell>
        <RoundCell>
            <span className="relative">
              {transactions}
              {txHasError &&
                <span className="absolute -right-6 top-0">
                  <i className="codicon codicon-warning text-[#E37933]" />
                </span>
              }
            </span>
        </RoundCell>
        <RoundCell value={inputs} />
        <RoundCell value={outputs} />
        <RoundCell value={mints} />
      </VscodeTableRow>
      {!collapsed &&
        <VscodeTableRow className={index % 2 === 0 ? 'bg-base-19' : 'bg-base-20'}>
          <td colSpan={5} className="px-3 pb-3">
            <RoundTable round={round} />
          </td>
        </VscodeTableRow>
      }
    </>
  );
};

const RoundCell: React.FC<RoundCellProps> = (props: RoundCellProps) => (
  <VscodeTableCell
    className={
      (props.id ? ' text-left p-0' : ' text-center p-3') +
      (props.onClick ? ' cursor-pointer' : '')
    }
    onClick={props.onClick}
  >
    { 'value' in props ? props.value : props.children }
  </VscodeTableCell>
);

const RoundTable: React.FC<RoundTableProps> = ({ round }) => (
  <div className="relative z-1">
    <VscodeTabs className="px-3 pt-1 bg-base-20">
      <VscodeTabHeader slot="header">Inputs</VscodeTabHeader>
      <VscodeTabHeader slot="header">Outputs</VscodeTabHeader>
      <VscodeTabHeader slot="header">Mints</VscodeTabHeader>
      <VscodeTabPanel className="mt-3">
        {round.transitions.filter(transition => transition.tx).map((transition, index) => (
          <div key={index} className="p-3 mb-3 bg-base-19">
            <h3 className="mb-3 text-base-10 font-bold">
              {`Transaction ${index + 1}`}
              {transition.tx?.id &&
                <span className="ml-3 pl-3 border-l border-l-base-14 text-blue-05 cursor-pointer">
                  {`#${transition.tx?.id}`}
                </span>
              }
            </h3>
            <VscodeTable responsive resizable className="border border-base-13">
              <VscodeTableHeader slot="header" className="bg-transparent">
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">UTxO</VscodeTableHeaderCell>
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">Address</VscodeTableHeaderCell>
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">Amount</VscodeTableHeaderCell>
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">Redeemer</VscodeTableHeaderCell>
              </VscodeTableHeader>
              <VscodeTableBody slot="body">
                {transition.tx?.inputs.map((input, inputIndex) => (
                  <VscodeTableRow key={inputIndex}>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{input.utxo}</VscodeTableCell>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{input.address}</VscodeTableCell>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{txValueToString(input.value)}</VscodeTableCell>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{input.redeemerRaw || ''}</VscodeTableCell>
                  </VscodeTableRow>
                ))}
              </VscodeTableBody>
            </VscodeTable>
          </div>
        ))}
      </VscodeTabPanel>
      <VscodeTabPanel className="mt-3">
        {round.transitions.filter(transition => transition.tx).map((transition, index) => (
          <div key={index} className="p-3 mb-3 bg-base-19">
            <h3 className="mb-3 text-base-10 font-bold">
              {`Transaction ${index + 1}`}
              {transition.tx?.id &&
                <span className="ml-3 pl-3 border-l border-l-base-14 text-blue-05 cursor-pointer">
                  {`#${transition.tx?.id}`}
                </span>
              }
            </h3>
            <VscodeTable responsive resizable className="border border-base-13">
              <VscodeTableHeader slot="header" className="bg-transparent">
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">UTxO</VscodeTableHeaderCell>
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">Address</VscodeTableHeaderCell>
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">Amount</VscodeTableHeaderCell>
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">Datum</VscodeTableHeaderCell>
              </VscodeTableHeader>
              <VscodeTableBody slot="body">
                {transition.tx?.outputs.map((output, outputIndex) => (
                  <VscodeTableRow key={outputIndex}>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{output.utxo}</VscodeTableCell>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{output.address}</VscodeTableCell>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{txValueToString(output.value)}</VscodeTableCell>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{output.datum || ''}</VscodeTableCell>
                  </VscodeTableRow>
                ))}
              </VscodeTableBody>
            </VscodeTable>
          </div>
        ))}
      </VscodeTabPanel>
      <VscodeTabPanel className="mt-3">
        {round.transitions.filter(transition => transition.tx).map((transition, index) => (
          <div key={index} className="p-3 mb-3 bg-base-19">
            <h3 className="mb-3 text-base-10 font-bold">
              {`Transaction ${index + 1}`}
              {transition.tx?.id &&
                <span className="ml-3 pl-3 border-l border-l-base-14 text-blue-05 cursor-pointer">
                  {`#${transition.tx?.id}`}
                </span>
              }
            </h3>
            <VscodeTable responsive resizable className="border border-base-13">
              <VscodeTableHeader slot="header" className="bg-transparent">
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">Quantity</VscodeTableHeaderCell>
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">Name</VscodeTableHeaderCell>
                <VscodeTableHeaderCell className="p-2 text-center text-base-10 border border-base-13">Policy ID</VscodeTableHeaderCell>
              </VscodeTableHeader>
              <VscodeTableBody slot="body">
                {transition.tx?.mint?.assets.map((mint, mintIndex) => (
                  <VscodeTableRow key={mintIndex}>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{mint.quantity}</VscodeTableCell>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{mint.name}</VscodeTableCell>
                    <VscodeTableCell className="p-2 text-center border border-base-13">{mint.policyId}</VscodeTableCell>
                  </VscodeTableRow>
                ))}
              </VscodeTableBody>
            </VscodeTable>
          </div>
        ))}
      </VscodeTabPanel>
    </VscodeTabs>
  </div>
);

const TestRoundsTab: React.FC<Props> = ({ test, testRounds }) => {
  return (
    <VscodeTable className="h-full flex flex-col" responsive resizable>
      <TableHeader />
      <TableBody test={test} testRounds={testRounds} />
    </VscodeTable>
  );
};

export default TestRoundsTab;
