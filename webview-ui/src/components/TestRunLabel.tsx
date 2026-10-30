import { formatRunDate } from '../utils/format';

interface Props {
  previousRunDate: Date | null;
}

const TestRunLabel: React.FC<Props> = ({ previousRunDate }) => (
  <div className="mb-3 text-[12px] font-medium text-[var(--vscode-descriptionForeground)]">
    {previousRunDate === null ? 'CURRENT TESTRUN' : `PREVIOUS RUN: ${formatRunDate(previousRunDate)}`}
  </div>
);

export default TestRunLabel;
