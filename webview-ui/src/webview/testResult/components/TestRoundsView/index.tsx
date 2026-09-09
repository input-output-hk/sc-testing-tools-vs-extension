import { useState } from 'react';

import {
  VscodeTableHeader,
  VscodeTableHeaderCell,
  VscodeTableBody
} from '@vscode-elements/react-elements';

import ScrollableTable from '../../../../components/ScrollableTable';
import Toolbar from './Toolbar';
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

const roundHasMint = (round: TestRound, testType?: TestType): boolean =>
  testType === 'threat-model' ?
    (round as ThreatModelTestRound).traces.some(trace => (trace.tx?.mint?.assets.length ?? 0) > 0) :
    (round as TransitionTestRound).transitions.some(transition => (transition.tx?.mint?.assets.length ?? 0) > 0);

const filterRounds = (rounds: Array<TestRound>, filter: string | null, testType?: TestType): Array<TestRound> => {
  switch (filter) {
    case 'failed-rounds':
      return rounds.filter(round => round.status.status === 'failure');
    case 'skipped-rounds':
      return rounds.filter(round => round.status.status === 'discarded');
    case 'mint-transactions':
      return rounds.filter(round => roundHasMint(round, testType));
    default:
      return rounds;
  }
};

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

const TestRoundsView: React.FC<Props> = ({ test, testRounds, isActive, onOpenGraph }) => {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const handleSelectFilter = (value: string) => {
    setSelectedFilter(current => current === value ? null : value);
  };

  return (
    <div className="flex flex-col h-full border border-base-14">
      <Toolbar
        selectedFilter={selectedFilter}
        onSelectFilter={handleSelectFilter}
      />
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
          testRounds={filterRounds(testRounds, selectedFilter, test.type)}
          onOpenGraph={onOpenGraph}
        />
      </ScrollableTable>
    </div>
  );
}

export default TestRoundsView;
