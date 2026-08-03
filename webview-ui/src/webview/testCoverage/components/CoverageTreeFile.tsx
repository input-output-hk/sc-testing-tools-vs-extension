import { VscodeTreeItem } from '@vscode-elements/react-elements';

import CoverageSwatch from './CoverageSwatch';
import CoverageTreeTest from './CoverageTreeTest';
import { getFileName } from '../utils/coverageUtils';

interface Props {
  file: CoverageFileSummary;
}

const CoverageTreeFile: React.FC<Props> = ({ file }) => (
  <VscodeTreeItem open>
    <span className="flex flex-row w-full items-center justify-between gap-1.5">
      <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
        {getFileName(file.uri)}
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        {file.percentage > 0 && <span className="opacity-70">{file.percentage}%</span>}
        <CoverageSwatch percentage={file.percentage} />
      </span>
    </span>
    {file.tests.map((test) => (
      <CoverageTreeTest key={test.testId} test={test} />
    ))}
  </VscodeTreeItem>
);

export default CoverageTreeFile;
