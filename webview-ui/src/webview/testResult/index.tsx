import { useEffect, useState } from 'react';
import {
  VscodeTabs,
  VscodeTabHeader,
  VscodeTabPanel,
} from '@vscode-elements/react-elements';

import RunningIndicator from '../../components/RunningIndicator';
import TestHeader from '../../components/TestHeader';
import TestRoundsTab from './components/TestRoundsTab';
import TransactionGraphTab from './components/TransactionGraphTab';

import type { WebviewApi } from 'vscode-webview';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestResultView: React.FC<Props> = ({ vscode }) => {
  const [test, setTest] = useState<Test|null>(null);
  const [testRounds, setTestRounds] = useState<Array<TestRound>>([]);

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
        <VscodeTabs className="flex-1 min-h-0 flex flex-col p-4">
          <VscodeTabHeader slot="header">Test Rounds</VscodeTabHeader>
          <VscodeTabHeader slot="header">Transaction Graph</VscodeTabHeader>
          <VscodeTabPanel className="flex-1 min-h-0 pt-4">
            <TestRoundsTab test={test} testRounds={testRounds} />
          </VscodeTabPanel>
          <VscodeTabPanel className="flex-1 min-h-0 pt-4">
            <TransactionGraphTab test={test} testRounds={testRounds} />
          </VscodeTabPanel>
        </VscodeTabs>
      }
    </div>
  );
};

export default TestResultView;
