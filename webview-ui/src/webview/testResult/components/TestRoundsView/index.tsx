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

interface TableHeaderProps {
  headers: Array<string>;
}

interface TableBodyProps {
  testType?: TestType;
  testRounds: Array<TestRound>;
  onOpenGraph: (round: TestRound, nodeId?: string) => void;
}

const TableHeader: React.FC<TableHeaderProps> = ({ headers }) => (
  <VscodeTableHeader slot="header" className="bg-base-20 min-w-24">
    {headers.map(column => (
      <VscodeTableHeaderCell key={column} className="p-2 border border-base-14 text-center">
        {column}
      </VscodeTableHeaderCell>
    ))}
  </VscodeTableHeader>
);

const TableBody: React.FC<TableBodyProps> = ({ testType, testRounds, onOpenGraph }) => (
  <VscodeTableBody slot="body" className="flex-1 min-h-0 overflow-y-auto border-b border-x border-b-base-14 border-x-base-14">
    {testRounds.sort((a, b) => a.id - b.id).map((round, index) =>
      testType !== 'threat-model' ? (
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

const TestRoundsView: React.FC<Props> = ({ test, testRounds, isActive, onOpenGraph }) => (
  <ScrollableTable
    key={test.id.join(':')}
    isActive={isActive}
  >
    <TableHeader
      headers={test.type !== 'threat-model' ?
        ['Rounds', 'Transactions', 'Inputs', 'Outputs', 'Mints'] :
        ['Rounds', 'Transactions', 'Inputs', 'Outputs', 'Mints', 'Attacks']
      }
    />
    <TableBody
      testType={test.type}
      testRounds={testRounds}
      onOpenGraph={onOpenGraph}
    />
  </ScrollableTable>
)

export default TestRoundsView;
