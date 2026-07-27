import { VscodeButton } from '@vscode-elements/react-elements';

import type { WebviewApi } from 'vscode-webview';

interface Props {
  vscode: WebviewApi<unknown>;
  message?: string;
}

const EmptyView: React.FC<Props> = ({ vscode, message = 'No tests have been found in this workspace yet. Open a folder in the workspace to see tests.' }) => (
  <div className="h-full p-4">
    <p className="text-[12px] opacity-60">{message}</p>
    <VscodeButton
      className="mt-4 w-full max-w-[300px]"
      onClick={() => vscode.postMessage({ type: 'open-folder' } as WebviewToExtensionMessage)}
    >
      Open Folder
    </VscodeButton>
  </div>
);

export default EmptyView;