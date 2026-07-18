import { useEffect, useState } from 'react';

import type { WebviewApi } from 'vscode-webview';

import { VscodeRadioGroup, VscodeRadio, VscodeLabel } from '@vscode-elements/react-elements';

import Tooltip from '../../components/Tooltip';

interface Props {
  vscode: WebviewApi<unknown>;
}


const TestConfigurationView: React.FC<Props> = ({ vscode }) => {
  const [executionMode, setExecutionMode] = useState<ExtensionMode | null>('docker');
  const [error, setError] = useState({ hasError: false, message: '' });
  const [hasDocker, setHasDocker] = useState<boolean>(false);
  const [hasNix, setHasNix] = useState<boolean>(false);

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'execution-mode-config') {
        setExecutionMode(message.payload.executionMode);
      }
      if (message.type === 'dependency-status') {
        setError({ hasError: message.payload.hasError, message: message.payload.message });
        setHasDocker(message.payload.hasDocker);
        setHasNix(message.payload.hasNix);
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
    <div className="h-full p-4">
      <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <VscodeLabel className="font-semibold">
                Settings
              </VscodeLabel>
            </span>
            <p className="text-[12px] opacity-60">
              All settings are currently defined in the source code.
            </p>
          </div>
          {/* add elements to select rounds */}

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5">
              <VscodeLabel htmlFor="execution-mode" className="font-semibold">
                Execution Mode
              </VscodeLabel>
              <i
                id="execution-mode"
                className={error.hasError ? 'codicon codicon-error text-red-01' : 'codicon codicon-info opacity-60'}
              />
              {!error.hasError && <Tooltip content="Select the mode for executing commands." id="execution-mode" />}
            </span>
            {error.hasError ? (
              <p className="text-[12px] opacity-60">{error.message}</p>
            ) :
            <VscodeRadioGroup>
              <VscodeRadio
                name="execution-mode"
                checked={executionMode === 'nix'}
                disabled={!hasNix}
                onChange={() => onExecutionModeChange('nix')}
                className="mr-4"
              >
                NIX
              </VscodeRadio>
              <VscodeRadio
                name="execution-mode"
                checked={executionMode === 'docker'}
                disabled={!hasDocker}
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

export default TestConfigurationView;
