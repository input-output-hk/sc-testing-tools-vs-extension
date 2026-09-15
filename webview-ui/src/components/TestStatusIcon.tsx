import StatusIcon from './StatusIcon';

interface Props {
  status: RunStatusContext;
  isThreatModel?: boolean;
}

const mapTestStatusToClassName = (status: RunStatusContext, isThreatModel?: boolean): string => {
  if (status.isRunning) return 'codicon-loading';
  if (status.isWaiting) return 'codicon-history text-[var(--vscode-testing-iconQueued)]';
  switch (status.status) {
    case 'undetermined':
      return isThreatModel === true ? 'codicon-debug-step-over text-[var(--vscode-testing-iconSkipped)]' : 'codicon-circle text-[var(--vscode-testing-iconUnset)]';
    case 'valid':
      return 'codicon-pass text-[var(--vscode-testing-iconPassed)]';
    case 'invalid':
      return 'codicon-error text-[var(--vscode-testing-iconFailed)]';
  }
};

const TestStatusIcon: React.FC<Props> = ({ status, isThreatModel }) => (
  <StatusIcon
    className={mapTestStatusToClassName(status, isThreatModel)}
    animated={status.isRunning}
  />
);

export default TestStatusIcon;