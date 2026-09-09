import Tooltip from '../../../../components/Tooltip';

interface Props {
  roundId: number;
  status: TestRoundStatus;
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

const mapRoundStatusToTooltip = (status: TestRoundStatus): string => {
  switch (status.status) {
    case 'success':
      return 'Successful Round';
    case 'failure':
      return status.message ? `Failed Round ${status.message}` : 'Failed Round';
    case 'discarded':
      return 'Skipped Round';
  }
};

const RoundStatusIcon: React.FC<Props> = ({ roundId, status }) => {
  const tooltipId = `round-status-${roundId}`;

  return (
    <>
      <i
        id={tooltipId}
        className={`translate-y-0.75 ml-1 mr-0.5 codicon ${mapRoundStatusToIcon(status.status)}`}
      />
      <Tooltip
        content={mapRoundStatusToTooltip(status)}
        id={tooltipId}
        place="bottom-start"
        positionStrategy="fixed"
      />
    </>
  );
};

export default RoundStatusIcon;
