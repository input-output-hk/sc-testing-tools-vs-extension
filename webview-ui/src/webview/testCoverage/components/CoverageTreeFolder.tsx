import { VscodeTreeItem } from '@vscode-elements/react-elements';

import useTreeItemState from '../../testTree/components/TreeView/useTreeItemState';
import useCollapseOnSignal from '../utils/useCollapseOnSignal';

interface Props {
  label: string;
  collapseSignal: number;
  children: React.ReactNode;
}

const CoverageTreeFolder: React.FC<Props> = ({ label, collapseSignal, children }) => {
  const [isOpen, setIsOpen] = useCollapseOnSignal(collapseSignal);
  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (collapsed) => setIsOpen(!collapsed),
  });

  return (
    <VscodeTreeItem ref={treeItemRef} open={isOpen}>
      <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
        {label}
      </span>
      {children}
    </VscodeTreeItem>
  );
};

export default CoverageTreeFolder;
