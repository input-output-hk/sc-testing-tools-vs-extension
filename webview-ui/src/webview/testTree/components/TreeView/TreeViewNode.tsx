import TreeViewGroup from './TreeViewGroup';
import TreeViewTest from './TreeViewTest';

interface TreeViewNodeProps {
  node: TestTreeNode;
  path: Array<string>;
  tests: TestList;
  filterText: string;
  statusFilter: TestStatus | null;
  onRunTest: (testIds: Array<string>) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
  onUpdateSelection: (testIds: Array<string>, selected: boolean) => void;
}

const TreeViewNode: React.FC<TreeViewNodeProps> = ({
  node,
  path,
  tests,
  filterText,
  statusFilter,
  onRunTest,
  onToggleTreeGroup,
  onUpdateSelection,
}) =>
  node.type === 'group' ? (
    <TreeViewGroup
      node={node as TestTreeGroupNode}
      path={path}
      tests={tests}
      filterText={filterText}
      statusFilter={statusFilter}
      onRunTest={onRunTest}
      onToggleTreeGroup={onToggleTreeGroup}
      onUpdateSelection={onUpdateSelection}
    />
  ) : (
    <TreeViewTest
      node={node as TestTreeTestNode}
      tests={tests}
      onRunTest={onRunTest}
      onUpdateSelection={onUpdateSelection}
    />
  );

export default TreeViewNode;
