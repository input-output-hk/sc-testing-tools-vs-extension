import { useEffect, useState, useRef } from 'react';

import RunningIndicator from '../../components/RunningIndicator';
import TestHeader from '../../components/TestHeader';
import Tabs from './components/Tabs';
import TestRoundsView from './components/TestRoundsView';
import TransactionGraphView from './components/TransactionGraphView';

import type { WebviewApi } from 'vscode-webview';
import type { TransactionGraphViewRef } from './components/TransactionGraphView';

const TEST_ROUNDS_TAB = 'rounds';
const TX_GRAPH_TAB = 'graph';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestResultView: React.FC<Props> = ({ vscode }) => {
  const graphRef = useRef<TransactionGraphViewRef>(null);
  const [test, setTest] = useState<Test|null>(null);
  const [testRounds, setTestRounds] = useState<Array<TestRound>>([]);
  const [selectedTab, setSelectedTab] = useState<string>(TEST_ROUNDS_TAB);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'test-result') {
        setTest(message.payload.test);
        setTestRounds(message.payload.rounds);
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const handleOpenGraph = (round: TestRound, txId?: string, txType?: TxType): void => {
    setSelectedTab(TX_GRAPH_TAB);
    if (txId === undefined) {
      graphRef.current?.selectRound(round);
    } else {
      graphRef.current?.selectTx(round, txId, txType);
    }
  };

  if (!test) return <></>;

  return (
    <div className="flex flex-col h-full bg-base-20">
      <div className="flex-none pt-4 px-4">
        <TestHeader test={test} />
      </div>

      { test.status === 'running' && testRounds.length === 0 &&
        <RunningIndicator />
      }

      { test.status !== 'running' && testRounds.length === 0 &&
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="text-md">This test does not have any rounds</span>
        </div>
      }

      { testRounds.length > 0 &&
        <Tabs
          className="flex-1 min-h-0 flex flex-col p-4"
          panelClassName="flex-1 min-h-0 pt-4"
          selectedId={selectedTab}
          onSelect={setSelectedTab}
          tabs={[
            {
              id: TEST_ROUNDS_TAB,
              label: 'Test rounds',
              panel: (
                <TestRoundsView
                  test={test}
                  testRounds={testRounds}
                  onOpenGraph={handleOpenGraph}
                  isActive={selectedTab === TEST_ROUNDS_TAB}
                />
              ),
            },
            {
              id: TX_GRAPH_TAB,
              label: 'Transaction Graph',
              panel: (
                <TransactionGraphView
                  test={test}
                  testRounds={testRounds}
                  ref={graphRef}
                />
              ),
            },
          ]}
        />
      }
    </div>
  );
};

export default TestResultView;
