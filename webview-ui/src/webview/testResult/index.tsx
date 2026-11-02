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
const ERROR_DETAILS_TAB = 'errors';

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

  const handleOpenGraph = (round: TestRound, nodeId?: string): void => {
    setSelectedTab(TX_GRAPH_TAB);
    requestAnimationFrame(() =>
      graphRef.current?.showRoundNode(round, nodeId)
    );
  };

  if (!test) return <></>;

  const hasErrorDetails = test.status === 'invalid' && !test.isRunning && !test.isWaiting && !!test.failureMessage;
  const activeTab = testRounds.length === 0 && hasErrorDetails
    ? ERROR_DETAILS_TAB
    : selectedTab === ERROR_DETAILS_TAB && !hasErrorDetails ? TEST_ROUNDS_TAB : selectedTab;

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-none pt-4 px-4">
        <TestHeader test={test} />
      </div>

      { test.isRunning && testRounds.length === 0 &&
        <RunningIndicator />
      }

      { !test.isRunning && testRounds.length === 0 && !hasErrorDetails &&
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="text-md">This test does not have any rounds</span>
        </div>
      }

      { (testRounds.length > 0 || hasErrorDetails) &&
        <Tabs
          className="flex-1 min-h-0 flex flex-col p-4"
          panelClassName="flex-1 min-h-0 pt-4"
          selectedId={activeTab}
          onSelect={setSelectedTab}
          tabs={[
            ...(testRounds.length > 0 ? [
              {
                id: TEST_ROUNDS_TAB,
                label: 'Test Rounds',
                panel: (
                  <TestRoundsView
                    test={test}
                    testRounds={testRounds}
                    onOpenGraph={handleOpenGraph}
                    isActive={activeTab === TEST_ROUNDS_TAB}
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
                    isActive={activeTab === TX_GRAPH_TAB}
                  />
                ),
              },
            ] : []),
            ...(hasErrorDetails ? [{
              id: ERROR_DETAILS_TAB,
              label: 'Error Details',
              panel: (
                <div role="alert" className="h-full overflow-auto border-l-2 border-[var(--vscode-errorForeground)] px-3 py-2">
                  <h2 className="font-semibold text-[var(--vscode-errorForeground)]">Test failed</h2>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-sm">{test.failureMessage}</pre>
                </div>
              ),
            }] : []),
          ]}
        />
      }
    </div>
  );
};

export default TestResultView;
