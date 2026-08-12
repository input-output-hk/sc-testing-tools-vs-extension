import { useEffect, useState } from 'react';

import { VscodeProgressBar } from '@vscode-elements/react-elements';

import type { WebviewApi } from 'vscode-webview';

import CoverageTree from './components/CoverageTree';

interface TestCoverageProps {
  vscode: WebviewApi<unknown>;
}

const upsertCoverageFile = (files: Array<FileCoverageWithStats>, file: FileCoverageWithStats): Array<FileCoverageWithStats> => {
  const index = files.findIndex((existing) => existing.filePath === file.filePath);
  if (index === -1) return [...files, file];
  const next = [...files];
  next[index] = file;
  return next;
};

const TestCoverageView: React.FC<TestCoverageProps> = ({ vscode }) => {
  const [files, setFiles] = useState<Array<FileCoverageWithStats> | null>(null);

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
      {files !== null && <CoverageTree files={files} />}
    </>
  );
};

export default TestCoverageView;
