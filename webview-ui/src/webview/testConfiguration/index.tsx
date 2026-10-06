import { useEffect, useState } from 'react';

import type { WebviewApi } from 'vscode-webview';

import { VscodeRadioGroup, VscodeRadio, VscodeLabel, VscodeTextfield } from '@vscode-elements/react-elements';

import Tooltip from '../../components/Tooltip';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestConfigurationView: React.FC<Props> = ({ vscode }) => {
  const [executionMode, setExecutionMode] = useState<ExtensionMode | null>('docker');
  const [error, setError] = useState<DependencyError>({ hasError: false, message: '', code: undefined });
  const [testRoundsMode, setTestRoundsMode] = useState<'default' | 'custom'>('default');
  const [rounds, setRounds] = useState<string>('100');

  useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);

    const messageHandler = (event: MessageEvent) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message.type === 'config-execution-mode') {
        setExecutionMode(message.payload.executionMode);
      }
      if (message.type === 'status-missing-dependency') {
        setError({ hasError: message.payload.error.hasError, message: message.payload.error.message, code: message.payload.error.code });
      }
      if (message.type === 'config-test-rounds') {
        setTestRoundsMode(message.payload.rounds === null ? 'default' : 'custom');
        if (message.payload.rounds !== null) setRounds(String(message.payload.rounds));
      }
    };

    window.addEventListener('message', messageHandler);

    return () => window.removeEventListener('message', messageHandler);
  }, [vscode]);

  const onExecutionModeChange = (mode: ExtensionMode) => {
    setExecutionMode(mode);
    vscode.postMessage({ type: 'config-update-execution-mode', payload: { executionMode: mode } } as WebviewToExtensionMessage);
  };

  const onRoundsChange = (event: InputEvent) => {
    const value = (event.target as HTMLInputElement).value;
    setRounds(value);

    const rounds = Number(value);
    if (Number.isNaN(rounds)) return;

    vscode.postMessage({ type: 'config-update-test-rounds', payload: { rounds } } as WebviewToExtensionMessage);
  };

  const onDefaultRoundsChange = () => {
    setTestRoundsMode('default');
    vscode.postMessage({ type: 'config-update-test-rounds', payload: { rounds: null } } as WebviewToExtensionMessage);
  };

  const onCustomRoundsChange = () => {
    setTestRoundsMode('custom');
    vscode.postMessage({ type: 'config-update-test-rounds', payload: { rounds: Number(rounds) } } as WebviewToExtensionMessage);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <VscodeLabel className="font-semibold">
                Rounds Per Test
              </VscodeLabel>
              <i id="test-rounds" className='codicon codicon-info opacity-60' />
              <Tooltip content="Number of transaction rounds generated, same as QuickCheck tests. Default uses the test suite's configured rounds." id="test-rounds" />
            </span>
            <VscodeRadioGroup>
              <VscodeRadio
                name="test-rounds"
                checked={testRoundsMode === 'default'}
                onChange={onDefaultRoundsChange}
                className="mr-4"
              >
                Default
              </VscodeRadio>
              <VscodeRadio
                name="test-rounds"
                checked={testRoundsMode === 'custom'}
                onChange={onCustomRoundsChange}
              >
                Custom
              </VscodeRadio>
            </VscodeRadioGroup>
            <VscodeTextfield
              id="rounds-per-test-textfield"
              className="w-full bg-[var(--vscode-input-background)]  text-[var(--vscode-input-foreground)] rounded-[var(--vscode-cornerRadius-small)] border-1 border-[var(--vscode-commandCenter-border)] focus:border-[var(--vscode-focusBorder)]"
              type="number"
              min={0}
              value={testRoundsMode === 'default' ? '' : rounds}
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
              {error.code !== 'no-dependencies' && (
                <Tooltip
                  content={error.hasError ? error.message : "Select the mode for executing commands."}
                  id="execution-mode"
                />
              )}
            </span>
            {error.hasError && error.code === 'no-dependencies' ? (
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