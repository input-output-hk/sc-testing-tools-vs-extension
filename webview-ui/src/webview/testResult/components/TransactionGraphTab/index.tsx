import { useState } from 'react';

import Toolbar from './Toolbar';

interface Props {
  test: Test;
  testRounds: Array<TestRound>;
}

const TransactionGraphTab: React.FC<Props> = ({ testRounds }) => {
  const [selectedRound, setSelectedRound] = useState<TestRound>(testRounds[0]);

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        testRounds={testRounds}
        selectedRound={selectedRound}
        onRoundChange={setSelectedRound}
      />
      <div className="flex-1 bg-base-19">

      </div>
    </div>
  );
};

export default TransactionGraphTab;
