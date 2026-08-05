import { VscodeButton } from '@vscode-elements/react-elements';

import type { WebviewApi } from 'vscode-webview';

interface Props {
  vscode: WebviewApi<unknown>;
  message: 'empty-workspaces' | 'empty-tree' | string;
}

const MESSAGE_EMPTY_WORKSPACES = 'No tests have been found in this workspace yet. Open a folder in the workspace to see tests.';
const MESSAGE_EMPTY_TREE = 'No test suites found in this workspace. Open a different folder, or add a test-suite file to the open folder.';

const EmptyView: React.FC<Props> = ({ vscode, message }) => (
  <div className="h-full p-4">
    <p className="text-[12px] opacity-60">
      {message === 'empty-workspaces' ? MESSAGE_EMPTY_WORKSPACES : message === 'empty-tree' ? MESSAGE_EMPTY_TREE : message}
    </p>
    <VscodeButton
      className="mt-4 w-full max-w-75"
      onClick={() => vscode.postMessage({ type: 'open-folder' } as WebviewToExtensionMessage)}
    >
      Open Folder
    </VscodeButton>
  </div>
);

export default EmptyView;