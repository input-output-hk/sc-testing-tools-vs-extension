import { useEffect, useState } from 'react';
import {
  VscodeTabs,
  VscodeTabHeader,
  VscodeTabPanel,
} from '@vscode-elements/react-elements';

import RunningIndicator from '../../components/RunningIndicator';
import TestStatusBadge from '../../components/TestStatusBadge';
import TestSelector from '../../components/TestSelector';
import TestRoundsTab from './components/TestRoundsTab';

import type { WebviewApi } from 'vscode-webview';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestResultView: React.FC<Props> = ({ vscode }) => {
  const [test, setTest] = useState<Test|null>(null);
  const [testRounds, setTestRounds] = useState<Array<TestRound>>([]);
  const [groupTests, setGroupTests] = useState<Array<Test>>([]);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'test-result') {
        setTest(message.payload.test);
        setTestRounds(message.payload.rounds);
        setGroupTests(message.payload.groupTests);
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const handleSelectTest = (testId: TestId) => {
    vscode.postMessage({ type: 'test-result-select-test', payload: { testId } } as WebviewToExtensionMessage);
  };

  const handleRecheck = () => {
    if (test !== null) {
      vscode.postMessage({ type: 'test-result-run-test' } as WebviewToExtensionMessage);
    }
  };

  if (!test) return <></>;

  return (
    <div className="flex flex-col h-full bg-base-20">
      <div className="flex-none flex justify-between items-center pt-4 px-4">
        <div className="flex-1">
          <TestSelector
            tests={groupTests}
            selectedTestId={test.id}
            onTestSelected={handleSelectTest}
          />
          <TestStatusBadge status={test.status} />
        </div>
        <button
          className="flex-none py-1 px-2 text-base-06 bg-base-15 rounded cursor-pointer inline-flex items-center gap-1.5"
          onClick={handleRecheck}
        >
          <i className="codicon codicon-refresh" />
          <span>Recheck</span>
        </button>
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
          <VscodeTabHeader slot="header">Test rounds</VscodeTabHeader>
          <VscodeTabPanel className="flex-1 min-h-0 pt-4">
            <TestRoundsTab test={test} testRounds={testRounds} />
          </VscodeTabPanel>
        </VscodeTabs>
      }
    </div>
  );
};

export default TestResultView;
