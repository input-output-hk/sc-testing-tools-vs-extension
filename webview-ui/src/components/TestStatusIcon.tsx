
interface Props {
  status: TestStatus;
}

const mapTestStatusToIcon = (status: TestStatus): string => {
  switch (status) {
    case 'undetermined':
      return 'codicon-circle opacity-60';
    case 'valid':
      return 'codicon-pass text-green-01';
    case 'invalid':
      return 'codicon-error text-red-01';
    case 'running':
      return 'codicon-question text-purple-02';
  }
};

const TestStatusIcon: React.FC<Props> = ({ status }) => (
  <i className={`codicon translate-y-0.75 ${mapTestStatusToIcon(status)}`} slot="icon-leaf" />
);

export default TestStatusIcon;