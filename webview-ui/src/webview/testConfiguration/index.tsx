import { useEffect, useState } from 'react';

import type { WebviewApi } from 'vscode-webview';

import { VscodeRadioGroup, VscodeTextfield, VscodeRadio, VscodeLabel } from '@vscode-elements/react-elements';

import Tooltip from '../../components/Tooltip';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestConfigurationView: React.FC<Props> = ({ vscode }) => {
  const [executionMode, setExecutionMode] = useState<ExtensionMode | null>('docker');
  const [error, setError] = useState<DependencyError>({ hasError: false, message: '', code: undefined });
  const [testRoundsMode, setTestRoundsMode] = useState<'default' | 'custom'>('custom');
  const [rounds, setRounds] = useState<string>('100');

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'execution-mode-config') {
        setExecutionMode(message.payload.executionMode);
      }
      if (message.type === 'dependency-status') {
        setError({ hasError: message.payload.error.hasError, message: message.payload.error.message, code: message.payload.error.code });
      }
      if (message.type === 'test-rounds-config') {
        setRounds(String(message.payload.rounds));
      }
    };

    window.addEventListener('message', messageHandler);

    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const onExecutionModeChange = (mode: ExtensionMode) => {
    setExecutionMode(mode);
    vscode.postMessage({ type: 'update-execution-mode', payload: { executionMode: mode } } as WebviewToExtensionMessage);
  };

  const onRoundsChange = (event: InputEvent) => {
    const value = (event.target as HTMLInputElement).value;
    setRounds(value);

    const rounds = Number(value);
    if (Number.isNaN(rounds)) return;

    vscode.postMessage({ type: 'update-test-rounds', payload: { rounds } } as WebviewToExtensionMessage);
  };

  return (
    <div className="h-full p-4">
      <div className="flex flex-col gap-4">
          {/* <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <VscodeLabel className="font-semibold">
                Settings
              </VscodeLabel>
            </span>
            <p className="text-[12px] opacity-60">
              All settings are currently defined in the source code.
            </p>
          </div> */}
          {/* add elements to select rounds */}
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <VscodeLabel className="font-semibold">
                Rounds Per Test
              </VscodeLabel>
              <i id="test-rounds" className='codicon codicon-info opacity-60' />
              <Tooltip content="Number of transaction rounds generated, same as QuickCheck tests." id="test-rounds" />
            </span>
            <VscodeRadioGroup>
              <VscodeRadio
                name="test-rounds"
                checked={testRoundsMode === 'default'}
                onChange={() => setTestRoundsMode('default')}
                className="mr-4"
              >
                Default
              </VscodeRadio>
              <VscodeRadio
                name="test-rounds"
                checked={testRoundsMode === 'custom'}
                onChange={() => setTestRoundsMode('custom')}
              >
                Custom
              </VscodeRadio>
            </VscodeRadioGroup>
            <VscodeTextfield
              id="rounds-per-test-textfield"
              className="w-full"
              type="number"
              min={0}
              value={rounds}
              onInput={onRoundsChange}
              disabled={testRoundsMode === 'default'}
            />
          </div>
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
            {error.hasError && error.code === 1 ? (
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

export default TestConfigurationView;
