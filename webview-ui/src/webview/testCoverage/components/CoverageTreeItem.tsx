import { VscodeTreeItem } from '@vscode-elements/react-elements';

import CoveragePercentageBar from './CoveragePercentageBar';
import useTreeItemState from '../../../hooks/useTreeItemState';
import { getSortedKeys } from '../utils/coverage';

interface Props {
  node: CoverageTreeNode;
  path: Array<string>;
  onOpenFile: (filePath: string) => void;
  onUpdateOpenCoverageNode: (isOpen: boolean, path: Array<string>) => void;
}

interface FolderProps {
  node: CoverageTreeFolderNode;
  path: Array<string>;
  onOpenFile: (filePath: string) => void;
  onUpdateOpenCoverageNode: (isOpen: boolean, path: Array<string>) => void;
}

interface FileProps {
  node: CoverageTreeFileNode;
  onOpenFile: (filePath: string) => void;
}

interface LabelProps {
  node: CoverageTreeNode;
  onClick?: () => void;
}

const CoverageTreeItem: React.FC<Props> = ({ node, path, onOpenFile, onUpdateOpenCoverageNode }) => (
  Object.hasOwn(node, 'nodes') ?
    <CoverageTreeFolder
      node={node as CoverageTreeFolderNode}
      path={path}
      onOpenFile={onOpenFile}
      onUpdateOpenCoverageNode={onUpdateOpenCoverageNode}
    />
  :
    <CoverageTreeFile
      node={node as CoverageTreeFileNode}
      onOpenFile={onOpenFile}
    />
);

const CoverageTreeFolder: React.FC<FolderProps> = ({ node, path, onOpenFile, onUpdateOpenCoverageNode }) => {
  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onUpdateOpenCoverageNode(!isCollapsed, path);
    },
  });

  return (
    <VscodeTreeItem ref={treeItemRef} open={node.isOpen}>
      <CoverageTreeLabel node={node} />
      {getSortedKeys(node.nodes).map(key => (
        <CoverageTreeItem
          key={key}
          node={node.nodes[key]}
          path={[...path, key]}
          onOpenFile={onOpenFile}
          onUpdateOpenCoverageNode={onUpdateOpenCoverageNode}
        />
      ))}
    </VscodeTreeItem>
  );
};

const CoverageTreeFile: React.FC<FileProps> = ({ node, onOpenFile }) => (
  <VscodeTreeItem>
    <CoverageTreeLabel node={node} onClick={() => onOpenFile(node.path)} />
  </VscodeTreeItem>
);

const CoverageTreeLabel: React.FC<LabelProps> = ({ node, onClick }) => {
  const percentage = node.total > 0 ? Math.round(node.covered / node.total * 100) : 0;
  return (
    <span
      onClickCapture={onClick}
      className="flex flex-row w-full items-center justify-between gap-1.5 cursor-pointer"
    >
      <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-base-06">
        {node.name}
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        {percentage > 0 && <span className="text-base-06">{percentage}%</span>}
        <CoveragePercentageBar percentage={percentage} />
      </span>
    </span>
  );
};

export default CoverageTreeItem;