import TreeViewGroup from './TreeViewGroup';
import TreeViewTest from './TreeViewTest';

interface TreeViewNodeProps {
  workspaceId: string;
  packageName: string;
  suiteName: string;
  node: TestTreeNode;
  path: Array<string>;
  filterText: string;
  statusFilter: RunStatus | null;
  onRunTests: (testIds: Array<RunTestId>) => void;
  onUpdateSelection: (testIds: Array<RunTestId>, selected: boolean) => void;
  onUpdateOpenTestTreeNode: (
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ) => void;
}

const TreeViewNode: React.FC<TreeViewNodeProps> = ({
  workspaceId,
  packageName,
  suiteName,
  node,
  path,
  filterText,
  statusFilter,
  onRunTests,
  onUpdateSelection,
  onUpdateOpenTestTreeNode,
}) =>
  node.type === 'group' ? (
    <TreeViewGroup
      node={node as TestTreeGroupNode}
      path={path}
      workspaceId={workspaceId}
      packageName={packageName}
      suiteName={suiteName}
      filterText={filterText}
      statusFilter={statusFilter}
      onRunTests={onRunTests}
      onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
      onUpdateSelection={onUpdateSelection}
    />
  ) : (
    <TreeViewTest
      node={node as TestTreeTestNode}
      path={path}
      onRunTests={onRunTests}
      onUpdateSelection={onUpdateSelection}
    />
  );

export default TreeViewNode;
