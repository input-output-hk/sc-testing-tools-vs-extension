import { VscodeTreeItem } from '@vscode-elements/react-elements';

import CoveragePercentageBar from './CoveragePercentageBar';

interface Props {
  label: string;
  percentage: number;
  filePath: string;
  onOpenFile: (filePath: string) => void;
}

const CoverageTreeFile: React.FC<Props> = ({ label, percentage, filePath, onOpenFile }) => {
  const handleClick = () => onOpenFile(filePath);

  return (
    <VscodeTreeItem>
      <span onClickCapture={handleClick} className="flex flex-row w-full items-center justify-between gap-1.5 cursor-pointer">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-base-06">
          {label}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {percentage > 0 && <span className="text-base-06">{percentage}%</span>}
          <CoveragePercentageBar percentage={percentage} />
        </span>
      </span>
    </VscodeTreeItem>
  );
};

export default CoverageTreeFile;
