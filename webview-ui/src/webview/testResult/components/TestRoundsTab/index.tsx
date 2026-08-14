import {
  VscodeTable,
  VscodeTableHeader,
  VscodeTableHeaderCell,
  VscodeTableBody
} from '@vscode-elements/react-elements';

import TransitionRoundRow from './TransitionRoundRow';
import ThreatModelRoundRow from './ThreatModelRoundRow';

interface Props {
  test: Test;
  testRounds: Array<TestRound>;
}

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
      round.type !== 'threat-model' ? (
        <TransitionRoundRow key={index} index={index} round={round as TransitionTestRound} />
      ) : (
        <ThreatModelRoundRow key={index} index={index} round={round as ThreatModelTestRound} />
      )
    )}
  </VscodeTableBody>
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
