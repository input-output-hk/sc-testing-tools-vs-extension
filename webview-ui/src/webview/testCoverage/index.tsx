import { useEffect, useState } from 'react';

import { VscodeProgressBar } from '@vscode-elements/react-elements';

import type { WebviewApi } from 'vscode-webview';

import CoverageTitle from './components/CoverageTitle';
import CoverageTree from './components/CoverageTree';
import {
  CoverageBarThresholdsContext,
  DEFAULT_COVERAGE_BAR_THRESHOLDS,
} from './context/coverageBarThresholds';

interface TestCoverageProps {
  vscode: WebviewApi<unknown>;
}

const TestCoverageView: React.FC<TestCoverageProps> = ({ vscode }) => {
  const [scope, setScope] = useState<CoverageScope>({ type: 'all' });
  const [coverageTree, setCoverageTree] = useState<CoverageTree | null>(null);
  const [barThresholds, setBarThresholds] = useState<CoverageBarThresholds>(DEFAULT_COVERAGE_BAR_THRESHOLDS);
  const hasItems = coverageTree !== null && Object.keys(coverageTree).length > 0;

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'coverage-tree') {
        setScope(message.payload.scope);
        setCoverageTree(message.payload.coverageTree);
      }
      if (message.type === 'config-coverage-bar-thresholds') {
        setBarThresholds(message.payload.thresholds);
      }
    };

    window.addEventListener('message', messageHandler);

    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const onOpenFile = (filePath: string): void => {
    vscode.postMessage({ type: 'coverage-open-file', payload: { filePath } } as WebviewToExtensionMessage);
  };

  const onUpdateOpenCoverageNode = (isOpen: boolean, path: Array<string>): void => {
    vscode.postMessage({ type: 'coverage-tree-update', payload: { isOpen, path } });
  };

  const onShowAllCoverage = (): void => {
    vscode.postMessage({ type: 'coverage-show-all' } as WebviewToExtensionMessage);
  };

  return (
    <CoverageBarThresholdsContext.Provider value={barThresholds}>
      {coverageTree === null &&
        <div className="h-full">
          <VscodeProgressBar />
        </div>
      }
      {coverageTree !== null &&
        <div className="flex h-full flex-col">
          <CoverageTitle
            scope={scope}
            hasItems={hasItems}
            onClearFullCoverage={onShowAllCoverage}
          />
          <div className="min-h-0 flex-1">
            <CoverageTree
              coverageTree={coverageTree}
              onOpenFile={onOpenFile}
              onUpdateOpenCoverageNode={onUpdateOpenCoverageNode}
            />
          </div>
        </div>
      }
    </CoverageBarThresholdsContext.Provider>
  );
};

export default TestCoverageView;
