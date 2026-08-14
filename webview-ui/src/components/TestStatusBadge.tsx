
const TEST_STATUS_CONFIG: Record<RunStatus, { icon: string; label: string; className: string }> = {
  undetermined: {
    icon: 'question',
    label: 'Undetermined',
    className: 'text-purple-02',
  },
  waiting: {
    icon: 'history',
    label: 'Waiting',
    className: 'text-yellow-02',
  },
  running: {
    icon: 'loading codicon-modifier-spin',
    label: 'Running',
    className: 'text-blue-06',
  },
  valid: {
    icon: 'pass',
    label: 'Valid',
    className: 'text-green-01'
  },
  invalid: {
    icon: 'error',
    label: 'Invalid',
    className: 'text-red-01'
  },
};

const TestStatusBadge: React.FC<{ status: RunStatus }> = ({
  status,
}) => {
  const { icon, label, className } = TEST_STATUS_CONFIG[status];
  return (
    <span className={`ml-3 text-xs font-medium inline-flex items-center gap-1.5 ${className}`}>
      <i className={`codicon codicon-${icon}`} />
      <span>{label}</span>
    </span>
  );
};

export default TestStatusBadge;
