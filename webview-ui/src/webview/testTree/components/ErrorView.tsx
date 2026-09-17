import { VscodeButton } from '@vscode-elements/react-elements';

import type { WebviewApi } from 'vscode-webview';

interface Props {
  vscode: WebviewApi<unknown>;
}

const ErrorView: React.FC<Props> = ({ vscode }) => (
  <div className="h-full p-4">
    <p className="text-[12px] opacity-60">Error occured while attempting to discover tests. View the output panel for more details.</p>
    <VscodeButton
      className="mt-4 w-full max-w-[300px]"
      onClick={() => vscode.postMessage({ type: 'test-tree-fetch' } as WebviewToExtensionMessage)}
    >
      Retry
    </VscodeButton>
  </div>
);

export default ErrorView;