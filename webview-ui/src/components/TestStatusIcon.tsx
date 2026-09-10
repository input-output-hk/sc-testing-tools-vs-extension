import StatusIcon from './StatusIcon';

interface Props {
  status: RunStatusContext;
  isThreatModel?: boolean;
}

const mapTestStatusToClassName = (status: RunStatusContext, isThreatModel?: boolean): string => {
  if (status.isRunning) return 'codicon-loading';
  if (status.isWaiting) return 'codicon-history text-yellow-02';
  switch (status.status) {
    case 'undetermined':
      return isThreatModel === true ? 'codicon-debug-step-over opacity-60' : 'codicon-circle opacity-60';
    case 'valid':
      return 'codicon-pass text-green-01';
    case 'invalid':
      return 'codicon-error text-red-01';
  }
};

const TestStatusIcon: React.FC<Props> = ({ status, isThreatModel }) => (
  <StatusIcon
    className={mapTestStatusToClassName(status, isThreatModel)}
    animated={status.isRunning}
  />
);

export default TestStatusIcon;