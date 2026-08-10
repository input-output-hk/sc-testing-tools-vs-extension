import { VscodeTreeItem } from '@vscode-elements/react-elements';

import CoveragePercentageBar from './CoveragePercentageBar';

interface Props {
  label: string;
  percentage: number;
}

const CoverageTreeFile: React.FC<Props> = ({ label, percentage }) => (
  <VscodeTreeItem>
    <span className="flex flex-row w-full items-center justify-between gap-1.5">
      <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
        {label}
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        {percentage > 0 && <span className="opacity-70">{percentage}%</span>}
        <CoveragePercentageBar percentage={percentage} />
      </span>
    </span>
  </VscodeTreeItem>
);

export default CoverageTreeFile;
