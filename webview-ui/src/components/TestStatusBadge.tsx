
const TEST_STATUS_CONFIG: Record<TestStatus, { icon: string; label: string; className: string }> = {
  undetermined: {
    icon: 'question',
    label: 'Undetermined',
    className: 'text-purple-02',
  },
  running: {
    icon: 'loading codicon-modifier-spin',
    label: 'Running',
    className: 'text-blue-06',
  },
  valid: { icon: 'pass', label: 'Valid', className: 'text-green-01' },
  invalid: { icon: 'error', label: 'Falsified', className: 'text-red-01' },
};

const TestStatusBadge: React.FC<{ status: TestStatus }> = ({
  status,
}) => {
  const { icon, label, className } = TEST_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-px rounded-sm text-xs font-medium shrink-0 ${className}`}
    >
      <i className={`codicon codicon-${icon}`} />
      {label}
    </span>
  );
};

export default TestStatusBadge;
