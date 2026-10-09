import React, {useState, useEffect} from 'react';

import type { WebviewApi } from 'vscode-webview';

import RoundsAccordion from './components/RoundsAccordion';
import HistoryTree from './components/HistoryTree';
import TreeViewFilter from '../testTree/components/TreeViewFilter';
import Tooltip from '../../components/Tooltip';
import { formatRunTime } from '../../utils/format';
import { buildHistoryTree, filterHistoryTree, isFilterActive } from './utils/historyTreeUtils';
import type { HistoryTestNode } from './utils/historyTreeUtils';

const EMPTY_FILTER: TestTreeFilter = {};

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
  const [testSummary, setTestSummary] = useState<TestResult | null>(null);
  const [summaryRunId, setSummaryRunId] = useState<string | null>(null);
  const [history, setHistory] = useState<TestSummaryHistory | null>(null);
  const [filter, setFilter] = useState<TestTreeFilter>(EMPTY_FILTER);
  const [openState, setOpenState] = useState<GenericMap<boolean>>({});

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'test-summary-details') {
        setTestSummary(message.payload.testResult);
        setSummaryRunId(message.payload.runId);
      } else if (message.type === 'test-summary-history') {
        setHistory(message.payload);
      }
    };

    window.addEventListener('message', messageHandler);

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [vscode]);

  const onSelectRound = (roundId: number) => {
    const runId = summaryRunId ?? testSummary?.test.lastRunId;
    if (testSummary === null || runId === undefined) return;
    vscode.postMessage({
      type: 'test-summary-open-round',
      payload: { testId: testSummary.test.id, runId, roundId }
    } as WebviewToExtensionMessage);
  };

  const handleChangeFilter = (nextFilter: TestTreeFilter) => {
    setFilter(nextFilter);
  };

  const handleClearSearch = () => {
    setFilter({ ...filter, text: undefined });
  };

  const handleToggleOpen = (key: string, isOpen: boolean) => {
    setOpenState(previous => ({ ...previous, [key]: isOpen }));
  };

  const handleSelectTest = (node: HistoryTestNode) => {
    vscode.postMessage({
      type: 'test-summary-open-test',
      payload: { testId: node.test.id, runId: node.runId }
    } as WebviewToExtensionMessage);
  };

  const runs = history !== null ? buildHistoryTree(history) : [];
  const [currentRun] = filterHistoryTree(runs.slice(0, 1), filter);
  const olderRuns = filterHistoryTree(runs.slice(1), filter);

  const path = testSummary ? [testSummary.test.id[1], testSummary.test.id[2], ...testSummary.test.group].join(' > ') : '';
  const validRounds = testSummary?.rounds.filter(round => round.status === 'success').map(round => round.id) ?? [];
  const failedRounds = testSummary?.rounds.filter(round => round.status === 'failure').map(round => round.id) ?? [];
  const skippedRounds = testSummary?.rounds.filter(round => round.status === 'discarded').length ?? 0;

  return (
    <div className="h-full flex">
      <div className="w-1/2 min-w-0 overflow-y-auto p-4 flex flex-col">
        {testSummary === null
          ? <div className="text-base-06">No test selected.</div>
          : <>
            <div className="flex items-center gap-2">
              <i className={`codicon codicon-${testSummary.test.status === 'valid' ? 'pass' : 'error'} ${testSummary.test.status === 'valid' ? 'text-green-01' : 'text-red-01'}`} />
              <span className="text-base-06 font-bold text-lg">{testSummary.test.name}</span>
              <span className="ml-auto text-base-06">{formatRunTime(testSummary.test.time ?? 0)}</span>
            </div>

            <div className="text-base-10 mt-1">
              {path} <span className="text-base-06">&gt; {testSummary.test.name}</span>
            </div>

            {testSummary.rounds.length > 0 ?
              <>
                <div className="mt-4 mb-4 border border-base-12 rounded-md bg-white/5">
                  <table className="w-full text-left">
                    <tbody>
                      <tr>
                        <TableCell amount={testSummary.rounds.length} label="Test Rounds" color="base-06" />
                        <TableCell amount={validRounds.length} label="Valid" color="green-01" />
                        <TableCell amount={failedRounds.length} label="Failed" color="red-01" />
                        <TableCell amount={skippedRounds} label="Skipped" color="base-06" />
                      </tr>
                    </tbody>
                  </table>
                </div>

                <RoundsAccordion title="Failed Rounds" rounds={failedRounds} defaultOpen onSelectRound={onSelectRound} />
                <RoundsAccordion title="Valid Rounds" rounds={validRounds} onSelectRound={onSelectRound} />
              </>
              : <div className="mt-4 text-base-06">This test has no rounds.</div>
            }
          </>
        }
      </div>
      <div className="w-1/2 min-w-0 flex flex-col border-l border-[var(--vscode-panel-border)]">
        <TreeViewFilter
          filter={filter}
          placeholder="Search for a test"
          onChangeFilter={handleChangeFilter}
          onClear={handleClearSearch}
        />
        <div className="flex-1 min-h-0 overflow-y-auto">
          {runs.length === 0
            ? <div className="p-4 text-[var(--vscode-descriptionForeground)]">No test runs yet.</div>
            : <HistoryTree
                currentRun={currentRun ?? null}
                olderRuns={olderRuns}
                openState={openState}
                forceOpen={isFilterActive(filter)}
                onToggleOpen={handleToggleOpen}
                onSelectTest={handleSelectTest}
              />
          }
        </div>
      </div>
      <Tooltip id="tree-node-action" place="left" />
    </div>
  );
};

export default TestSummaryView;
