import { useEffect, useState } from 'react';

import { VscodeProgressBar } from '@vscode-elements/react-elements';

import type { WebviewApi } from 'vscode-webview';

import CoverageSummary from './components/CoverageSummary';
import CoverageTree from './components/CoverageTree';

interface TestCoverageProps {
  vscode: WebviewApi<unknown>;
}

const upsertCoverageFile = (files: Array<FileCoverage>, file: FileCoverage): Array<FileCoverage> => {
  const index = files.findIndex((existing) => existing.filePath === file.filePath);
  if (index === -1) return [...files, file];
  const next = [...files];
  next[index] = file;
  return next;
};

const TestCoverageView: React.FC<TestCoverageProps> = ({ vscode }) => {
  const [files, setFiles] = useState<Array<FileCoverage> | null>(null);
  const [collapseSignal, setCollapseSignal] = useState(0);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'coverage') {
        setFiles(message.payload.files);
      }
      if (message.type === 'coverage-update') {
        console.log('---- message.payload.file---', message.payload.file);
        setFiles((files) => upsertCoverageFile(files ?? [], message.payload.file));
      }
      if (message.type === 'collapse-all-coverage') {
        setCollapseSignal((signal) => signal + 1);
      }
    };

    window.addEventListener('message', messageHandler);

    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const onOpenFile = (filePath: string) => {
    vscode.postMessage({ type: 'open-coverage-file', payload: { filePath } } as WebviewToExtensionMessage);
  };

  return (
    <>
      {files === null && (
        <div className="h-full">
          <VscodeProgressBar />
        </div>
      )}
      {files !== null && (
        <div className="flex h-full flex-col">
          {files.length > 0 && <CoverageSummary />}
          <div className="min-h-0 flex-1">
            <CoverageTree files={files} collapseSignal={collapseSignal} onOpenFile={onOpenFile} />
          </div>
        </div>
      )}
    </>
  );
};

export default TestCoverageView;
