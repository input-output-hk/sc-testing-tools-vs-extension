import { useEffect, useState } from 'react';
import {
  VscodeTabs,
  VscodeTabHeader,
  VscodeTabPanel,
} from '@vscode-elements/react-elements';

import type { WebviewApi } from 'vscode-webview';

import TestStatusBadge from '../../components/TestStatusBadge';
import TestCounterexampleTab from './components/TestCounterexampleTab';
import TestGraphTab from './components/TestGraphTab';
import TestPropertiesTab from './components/TestPropertiesTab';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestResultView: React.FC<Props> = ({ vscode }) => {
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'test-result') {
        setTestResult(message.payload.result);
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  if (!testResult) return <></>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center px-2 py-1 gap-2 shrink-0 border-b border-base-13 min-h-8">
        <TestStatusBadge status={testResult.test.status} />
      </div>

      <VscodeTabs
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <VscodeTabHeader slot="header">Counterexample Trace</VscodeTabHeader>
        <VscodeTabHeader slot="header">Transaction Graph</VscodeTabHeader>
        <VscodeTabHeader slot="header">Run Property Info</VscodeTabHeader>

        <VscodeTabPanel className="flex flex-col flex-1 overflow-hidden p-0">
          <TestCounterexampleTab testResult={testResult} />
        </VscodeTabPanel>

        <VscodeTabPanel className="flex flex-col flex-1 overflow-hidden p-0">
          <TestGraphTab testResult={testResult} />
        </VscodeTabPanel>

        <VscodeTabPanel className="flex flex-col flex-1 overflow-hidden p-0">
          <TestPropertiesTab testResult={testResult} />
        </VscodeTabPanel>
      </VscodeTabs>
    </div>
  );
};

export default TestResultView;
