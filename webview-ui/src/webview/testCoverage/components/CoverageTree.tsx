import { VscodeTree } from '@vscode-elements/react-elements';

import CoverageTreePackage from './CoverageTreePackage';
import CoverageTreeSuite from './CoverageTreeSuite';
import CoverageTreeFolder from './CoverageTreeFolder';
import CoverageTreeFile from './CoverageTreeFile';
import { getFileName, getFilePercentage, getFileRelativePath, groupFilesByPackageSuiteFolder } from '../utils/coverageUtils';

import type { CoverageFolderNode } from '../utils/coverageUtils';

interface Props {
  files: Array<FileCoverageWithStats>;
  onOpenFile: (filePath: string) => void;
}

const renderFolderNode = (name: string, node: CoverageFolderNode, onOpenFile: (filePath: string) => void): React.ReactNode => (
  <CoverageTreeFolder key={name} label={name}>
    {Object.entries(node.folders).map(([folderName, folderNode]) => renderFolderNode(folderName, folderNode, onOpenFile))}
    {node.files.map((file) => (
      <CoverageTreeFile key={file.filePath} label={getFileName(getFileRelativePath(file))} percentage={getFilePercentage(file)} filePath={file.filePath} onOpenFile={onOpenFile} />
    ))}
  </CoverageTreeFolder>
);

const CoverageTree: React.FC<Props> = ({ files, onOpenFile }) => {
  const tree = groupFilesByPackageSuiteFolder(files);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <VscodeTree>
          {Object.entries(tree).map(([packageName, suites]) => (
            <CoverageTreePackage key={packageName} label={packageName}>
              {Object.entries(suites).map(([suiteName, rootNode]) => (
                <CoverageTreeSuite key={suiteName} label={suiteName}>
                  {Object.entries(rootNode.folders).map(([folderName, folderNode]) => renderFolderNode(folderName, folderNode, onOpenFile))}
                  {rootNode.files.map((file) => (
                    <CoverageTreeFile key={file.filePath} label={getFileName(getFileRelativePath(file))} percentage={getFilePercentage(file)} filePath={file.filePath} onOpenFile={onOpenFile} />
                  ))}
                </CoverageTreeSuite>
              ))}
            </CoverageTreePackage>
          ))}
        </VscodeTree>
      </div>
    </div>
  );
};

export default CoverageTree;
