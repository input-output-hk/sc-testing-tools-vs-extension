import useSyncedSpin from '../hooks/useSyncedSpin';

interface Props {
  ref?: (el: HTMLElement | null) => void;
  status: RunStatus;
  isThreatModel?: boolean;
}

const mapTestStatusToIcon = (status: RunStatus, isThreatModel?: boolean): string => {
  switch (status) {
    case 'undetermined':
      return isThreatModel === true ? 'codicon-debug-step-over opacity-60' : 'codicon-circle opacity-60';
    case 'valid':
      return 'codicon-pass text-green-01';
    case 'invalid':
      return 'codicon-error text-red-01';
    case 'waiting':
      return 'codicon-history text-yellow-02';
    case 'running':
      return 'codicon-loading';
  }
};

const SimpleTestStatusIcon: React.FC<Props> = ({ ref, status, isThreatModel }) => (
  <i ref={ref} className={`codicon mr-0.5 ${mapTestStatusToIcon(status, isThreatModel)}`} />
);

const SpinningTestStatusIcon: React.FC<Props> = ({ status, isThreatModel }) => {
  const spinRef = useSyncedSpin();
  return <SimpleTestStatusIcon ref={spinRef} status={status} isThreatModel={isThreatModel} />;
};

const TestStatusIcon: React.FC<Props> = ({ status, isThreatModel }) => (
  status === 'running' ?
    <SpinningTestStatusIcon status={status} isThreatModel={isThreatModel} /> :
    <SimpleTestStatusIcon status={status} isThreatModel={isThreatModel} />
);

export default TestStatusIcon;