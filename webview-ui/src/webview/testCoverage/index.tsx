import { useEffect, useState } from 'react';

import { VscodeProgressBar } from '@vscode-elements/react-elements';

import type { WebviewApi } from 'vscode-webview';

import CoverageTitle from './components/CoverageTitle';
import CoverageTree from './components/CoverageTree';

interface TestCoverageProps {
  vscode: WebviewApi<unknown>;
}

const TestCoverageView: React.FC<TestCoverageProps> = ({ vscode }) => {
  const [coverageTree, setCoverageTree] = useState<CoverageTree | null>(null);
  const hasItems = coverageTree !== null && Object.keys(coverageTree).length > 0;

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'coverage-tree') {
        setCoverageTree(message.payload.coverageTree);
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
  }

  return (
    <>
      {coverageTree === null &&
        <div className="h-full">
          <VscodeProgressBar />
        </div>
      }
      {coverageTree !== null &&
        <div className="flex h-full flex-col">
          <CoverageTitle
            icon={hasItems}
            text={hasItems ? 'Coverage: Entire Test Run' : 'No coverage detected'}
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
    </>
  );
};

export default TestCoverageView;
