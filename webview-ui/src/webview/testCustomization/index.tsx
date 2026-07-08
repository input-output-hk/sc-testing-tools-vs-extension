import type { WebviewApi } from 'vscode-webview';

import { VscodeTextfield, VscodeRadioGroup, VscodeRadio } from '@vscode-elements/react-elements';

import Tooltip from '../../components/Tooltip';

interface Props {
  vscode: WebviewApi<unknown>;
}

const TestCustomizationView: React.FC<Props> = () => {
  return (
    <div className="h-full p-[16px]">
      <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              Rounds
              <i id="rounds-per-test" className="codicon codicon-info opacity-60" />
              <Tooltip content="Number of rounds of transactions generated, similar to QuickCheck." id="rounds-per-test" />
            </span>
            <VscodeTextfield
              id="rounds-per-test-textfield"
              className="w-full"
              type="number"
              min={0}
              value="100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              Execution Mode
              <i id="execution-mode" className="codicon codicon-info opacity-60" />
              <Tooltip content="Select the mode for executing commands." id="execution-mode" />
            </span>
            <VscodeRadioGroup>
              <VscodeRadio name="execution-mode" defaultChecked className="mr-4">
                NIX
              </VscodeRadio>
              <VscodeRadio name="execution-mode">
                Docker
              </VscodeRadio>
            </VscodeRadioGroup>
          </div>
        </div>
    </div>
  );
};

export default TestCustomizationView;
