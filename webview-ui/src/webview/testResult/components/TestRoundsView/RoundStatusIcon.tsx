interface Props {
  status: TestRoundStatus['status'];
}

const mapRoundStatusToIcon = (status: TestRoundStatus['status']): string => {
  switch (status) {
    case 'success':
      return 'codicon-pass text-[var(--vscode-testing-iconPassed)]';
    case 'failure':
      return 'codicon-error text-[var(--vscode-testing-iconFailed)]';
    case 'discarded':
      return 'codicon-debug-step-over text-[var(--vscode-testing-iconSkipped)]';
  }
};

const RoundStatusIcon: React.FC<Props> = ({ status }) => (
  <i className={`translate-y-0.75 ml-1 mr-0.5 codicon ${mapRoundStatusToIcon(status)}`} />
);

export default RoundStatusIcon;
