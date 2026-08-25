import {
  VscodeTableHeader,
  VscodeTableHeaderCell,
  VscodeTableBody
} from '@vscode-elements/react-elements';

import ScrollableTable from '../../../../components/ScrollableTable';
import TransitionRoundRow from './TransitionRoundRow';
import ThreatModelRoundRow from './ThreatModelRoundRow';

interface Props {
  test: Test;
  testRounds: Array<TestRound>;
  onOpenGraph: (round: TestRound, nodeId?: string) => void;
  isActive: boolean;
}

interface TableBodyProps {
  testRounds: Array<TestRound>;
  onOpenGraph: (round: TestRound, nodeId?: string) => void;
}

const TableHeader: React.FC = () => (
  <VscodeTableHeader slot="header" className="bg-base-20 min-w-24">
    {['Rounds', 'Transactions', 'Inputs', 'Outputs', 'Mints'].map(column => (
      <VscodeTableHeaderCell key={column} className="p-3 border border-base-14 text-center">
        {column}
      </VscodeTableHeaderCell>
    ))}
  </VscodeTableHeader>
);

const TableBody: React.FC<TableBodyProps> = ({ testRounds, onOpenGraph }) => (
  <VscodeTableBody slot="body" className="flex-1 min-h-0 overflow-y-auto border-b border-x border-b-base-14 border-x-base-14">
    {testRounds.sort((a, b) => a.id - b.id).map((round, index) =>
      round.type !== 'threat-model' ? (
        <TransitionRoundRow
          key={index}
          index={index}
          round={round as TransitionTestRound}
          onOpenGraph={onOpenGraph}
        />
      ) : (
        <ThreatModelRoundRow
          key={index}
          index={index}
          round={round as ThreatModelTestRound}
          onOpenGraph={onOpenGraph}
        />
      )
    )}
  </VscodeTableBody>
);

const TestRoundsTab: React.FC<Props> = ({ test, testRounds, isActive, onOpenGraph }) => (
  <ScrollableTable
    isActive={isActive}
    resetKey={test.id.join(':')}
  >
    <TableHeader />
    <TableBody
      testRounds={testRounds}
      onOpenGraph={onOpenGraph}
    />
  </ScrollableTable>
);

export default TestRoundsTab;
