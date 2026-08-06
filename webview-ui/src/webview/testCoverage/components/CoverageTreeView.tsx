import { VscodeTree } from '@vscode-elements/react-elements';

import CoverageTreeFolder from './CoverageTreeFolder';
import CoverageTreeGroup from './CoverageTreeGroup';
import CoverageTreeLeaf from './CoverageTreeLeaf';
import { getFileName, getGroupPercentage, groupFilesByPackageSuite } from '../utils/coverageUtils';

interface Props {
  files: Array<CoverageFileSummary>;
}

const CoverageTreeView: React.FC<Props> = ({ files }) => {
  const tree = groupFilesByPackageSuite(files);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <VscodeTree>
          {Object.entries(tree).map(([packageName, suites]) => (
            <CoverageTreeFolder key={packageName} label={packageName}>
              {Object.entries(suites).map(([suiteName, suiteFiles]) => (
                <CoverageTreeGroup key={suiteName} label={suiteName} percentage={getGroupPercentage(suiteFiles)}>
                  {suiteFiles.map((file) => (
                    <CoverageTreeGroup key={file.uri} label={getFileName(file.uri)} percentage={file.percentage}>
                      {file.tests.map((test) => (
                        <CoverageTreeLeaf key={test.testId} label={test.name} percentage={test.percentage} />
                      ))}
                    </CoverageTreeGroup>
                  ))}
                </CoverageTreeGroup>
              ))}
            </CoverageTreeFolder>
          ))}
        </VscodeTree>
      </div>
    </div>
  );
};

export default CoverageTreeView;
