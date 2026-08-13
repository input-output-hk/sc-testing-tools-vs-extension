import React, {useState, useEffect} from 'react';

import type { WebviewApi } from 'vscode-webview';

import RoundsAccordion from './components/RoundsAccordion';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TableCell: React.FC<{ amount: number, label: string, color: string }> = ({ amount, label, color }) => {
  return (
    <td className="py-3 pl-4">
      <span className={`text-${color} font-bold`}>{amount}</span>{' '}
      <span className="text-base-10">{label}</span>
    </td>
  )
}

const TestSummaryView: React.FC<Props> = ({ vscode }) => {
  const [testSummary, setTestSummary] = useState<TestSummaryDetails | null>(null);
  
  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'test-summary-details') {
        setTestSummary(message.payload.summaryDetails);
      }
    };

    window.addEventListener('message', messageHandler);

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [vscode]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="flex items-center gap-2">
          <i className={`codicon codicon-${testSummary?.status === 'valid' ? 'pass' : 'error'} ${testSummary?.status === 'valid' ? 'text-green-01' : 'text-red-01'}`} />
          <span className="text-base-06 font-bold text-lg">{testSummary?.testName}</span>
          <span className="ml-auto text-base-06">{testSummary?.totalTime}</span>
        </div>

        <div className="text-base-10 mt-1">
          {testSummary?.path} <span className="text-base-06">&gt; {testSummary?.testName}</span>
        </div>

        {testSummary?.rounds ? 
          <>
            <div className="mt-4 mb-4 border border-base-12 rounded-md bg-white/5">
              <table className="w-full text-left">
                <tbody>
                  <tr>
                    <TableCell amount={testSummary?.rounds.total} label="Test Rounds" color="base-06" />
                    <TableCell amount={testSummary?.rounds.valid.total} label="Valid" color="green-01" />
                    <TableCell amount={testSummary?.rounds.failed.total} label="Failed" color="red-01" />
                    <TableCell amount={testSummary?.rounds.skipped} label="Skipped" color="base-06" />
                  </tr>
                </tbody>
              </table>
            </div>
            
            <RoundsAccordion title="Failed Rounds" rounds={[94, 96, 97, 98, 99, 100]} defaultOpen />
            <RoundsAccordion title="Valid Rounds" rounds={[1, 2, 3, 4, 5, 6, 7, 8]} />
          </>
          : <div className="mt-4 text-base-06">No rounds data available.</div>
        }
      </div>
    </div>
  );
};

export default TestSummaryView;
