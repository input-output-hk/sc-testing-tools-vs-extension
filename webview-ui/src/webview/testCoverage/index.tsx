import { useEffect, useState } from 'react';

import { VscodeProgressBar } from '@vscode-elements/react-elements';

import type { WebviewApi } from 'vscode-webview';

import CoverageTreeView from './components/CoverageTreeView';

interface TestCoverageProps {
  vscode: WebviewApi<unknown>;
}

const upsertCoverageFile = (files: Array<CoverageFileSummary>, file: CoverageFileSummary): Array<CoverageFileSummary> => {
  const index = files.findIndex((existing) => existing.uri === file.uri);
  if (index === -1) return [...files, file];
  const next = [...files];
  next[index] = file;
  return next;
};

const TestCoverageView: React.FC<TestCoverageProps> = ({ vscode }) => {
  const [files, setFiles] = useState<Array<CoverageFileSummary> | null>(null);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'coverage-summary') {
        setFiles(message.payload.files);
      }
      if (message.type === 'coverage-update') {
        setFiles((files) => upsertCoverageFile(files ?? [], message.payload.file));
      }
    };

    window.addEventListener('message', messageHandler);

    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  return (
    <>
      {files === null && (
        <div className="h-full">
          <VscodeProgressBar />
        </div>
      )}
      {files !== null && <CoverageTreeView files={files} />}
    </>
  );
};

export default TestCoverageView;
