import { VscodeTree } from '@vscode-elements/react-elements';

import CoverageTreeItem from './CoverageTreeItem';
import { getSortedKeys } from '../utils/coverage';

interface Props {
  coverageTree: CoverageTree;
  onOpenFile: (filePath: string) => void;
  onUpdateOpenCoverageNode: (isOpen: boolean, path: Array<string>) => void;
}

const CoverageTree: React.FC<Props> = ({ coverageTree, onOpenFile, onUpdateOpenCoverageNode }) => (
  <div className="h-full flex flex-col">
    <div className="flex-1 overflow-y-auto">
      <VscodeTree>
        {getSortedKeys(coverageTree).map(key => (
          <CoverageTreeItem
            key={key}
            node={coverageTree[key]}
            path={[key]}
            onOpenFile={onOpenFile}
            onUpdateOpenCoverageNode={onUpdateOpenCoverageNode}
          />
        ))}
      </VscodeTree>
    </div>
  </div>
);

export default CoverageTree;
