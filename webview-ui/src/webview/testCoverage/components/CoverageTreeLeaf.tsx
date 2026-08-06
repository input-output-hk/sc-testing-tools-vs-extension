import { VscodeTreeItem } from '@vscode-elements/react-elements';

import CoverageSwatch from './CoverageSwatch';

interface Props {
  label: string;
  percentage: number;
}

const CoverageTreeLeaf: React.FC<Props> = ({ label, percentage }) => (
  <VscodeTreeItem>
    <span className="flex flex-row w-full items-center justify-between gap-1.5">
      <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
        {label}
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        {percentage > 0 && <span className="opacity-70">{percentage}%</span>}
        <CoverageSwatch percentage={percentage} />
      </span>
    </span>
  </VscodeTreeItem>
);

export default CoverageTreeLeaf;
