import { VscodeTreeItem } from '@vscode-elements/react-elements';

import CoverageSwatch from './CoverageSwatch';

interface Props {
  test: CoverageTestSummary;
}

const CoverageTreeTest: React.FC<Props> = ({ test }) => {
  const isCovered = test.percentage > 0;

  return (
    <VscodeTreeItem>
      <i
        className={`codicon translate-y-0.75 ${isCovered ? 'codicon-check text-green-01' : 'codicon-circle-outline opacity-60'}`}
        slot="icon-leaf"
      />
      <span className="flex flex-row w-full items-center justify-between gap-1.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {test.name}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {isCovered && <span className="opacity-70">{test.percentage}%</span>}
          <CoverageSwatch percentage={test.percentage} />
        </span>
      </span>
    </VscodeTreeItem>
  );
};

export default CoverageTreeTest;
