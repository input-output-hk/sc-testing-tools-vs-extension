import { useEffect, useState } from 'react';
import {
  VscodeTabs,
  VscodeTabHeader,
  VscodeTabPanel,
} from '@vscode-elements/react-elements';

import type { WebviewApi } from 'vscode-webview';

import TestStatusBadge from '../../components/TestStatusBadge';
import TestSelector from '../../components/TestSelector';
import TestRoundsTab from './components/TestRoundsTab';

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
    vscode.postMessage({ type: 'select-test', payload: { testId } } as WebviewToExtensionMessage);
  };

  const handleRecheck = () => {
    if (test !== null) {
      vscode.postMessage({ type: 'run-test' } as WebviewToExtensionMessage);
    }
  };

  if (!test) return <></>;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-base-20 p-4">
      <div className="flex items-center py-1 gap-2 shrink-0 border-b border-(--vscode-panel-border) min-h-8">
        <TestSelector
          tests={groupTests}
          selectedTestId={test.id}
          onTestSelected={handleSelectTest}
        />
        <TestStatusBadge status={test.status} />
        <div className="flex-1" />
        <button
          className="flex items-center gap-1.5 bg-base-15 text-base-06 rounded pl-2 pr-2.75 py-1.5 text-[13px] shrink-0 cursor-pointer active:bg-blue-07 active:text-base-01"
          onClick={handleRecheck}
        >
          <i className="codicon codicon-refresh" />
          Recheck
        </button>
      </div>

      <VscodeTabs className="flex-1 flex flex-col overflow-hidden min-h-0 mb-4">
        <VscodeTabHeader slot="header">Test rounds</VscodeTabHeader>

        <VscodeTabPanel className="flex flex-col flex-1 overflow-hidden p-0">
          <TestRoundsTab test={test} testRounds={testRounds} />
        </VscodeTabPanel>
      </VscodeTabs>
    </div>
  );
};

export default TestResultView;
