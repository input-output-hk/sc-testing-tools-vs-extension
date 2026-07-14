import { useEffect, useState } from 'react';

import type { WebviewApi } from 'vscode-webview';

import { VscodeRadioGroup, VscodeRadio, VscodeLabel } from '@vscode-elements/react-elements';

import Tooltip from '../../components/Tooltip';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestCustomizationView: React.FC<Props> = ({ vscode }) => {
  // TODO: replace with real dependency detection reported from the extension host.
  const error = {
    error: false,
    message: 'No dependencies were detected. Please ensure that at least one is properly installed so your testing tool can run.',
  };
  const [executionMode, setExecutionMode] = useState<ExtensionMode>('docker');

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'execution-mode-config') {
        setExecutionMode(message.payload.executionMode);
      }
    };

    window.addEventListener('message', messageHandler);

    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const onExecutionModeChange = (mode: ExtensionMode) => {
    setExecutionMode(mode);
    vscode.postMessage({ type: 'update-execution-mode', payload: { executionMode: mode } } as WebviewToExtensionMessage);
  };

  return (
    <div className="h-full p-[16px]">
      <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <VscodeLabel className="font-semibold">
                Settings
              </VscodeLabel>
            </span>
            <p className="text-[12px] opacity-60">
              All settings are currently defined in the source code. Each test suite provides an option to view and modify these configurations.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5">
              <VscodeLabel htmlFor="execution-mode" className="font-semibold">
                Execution Mode
              </VscodeLabel>
              <i
                id="execution-mode"
                className={error.error ? 'codicon codicon-error text-red-01' : 'codicon codicon-info opacity-60'}
              />
              <Tooltip content={error.message ?? 'Select the mode for executing commands.'} id="execution-mode" />
            </span>
            {error.error ? (
              <p className="text-[12px] opacity-60">{error.message}</p>
            ) : 
            <VscodeRadioGroup>
              <VscodeRadio
                name="execution-mode"
                checked={executionMode === 'nix'}
                onChange={() => onExecutionModeChange('nix')}
                className="mr-4"
              >
                NIX
              </VscodeRadio>
              <VscodeRadio
                name="execution-mode"
                checked={executionMode === 'docker'}
                onChange={() => onExecutionModeChange('docker')}
              >
                Docker
              </VscodeRadio>
            </VscodeRadioGroup>
            }
          </div>
        </div>
    </div>
  );
};

export default TestCustomizationView;
