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
  typeFilter: TestType | null;
  onRunTest: (testIds: Array<RunnableTestId>) => void;
  onUpdateSelection: (testIds: Array<RunnableTestId>, selected: boolean) => void;
  onUpdateOpenTestTreeNode: (
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ) => void;
  onOpenTestResult: (testId: TestId) => void;
}

const TreeViewNode: React.FC<TreeViewNodeProps> = ({
  workspaceId,
  packageName,
  suiteName,
  node,
  path,
  filterText,
  statusFilter,
  typeFilter,
  onRunTest,
  onUpdateSelection,
  onUpdateOpenTestTreeNode,
  onOpenTestResult,
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
      typeFilter={typeFilter}
      onRunTest={onRunTest}
      onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
      onUpdateSelection={onUpdateSelection}
      onOpenTestResult={onOpenTestResult}
    />
  ) : (
    <TreeViewTest
      node={node as TestTreeTestNode}
      path={path}
      onRunTest={onRunTest}
      onUpdateSelection={onUpdateSelection}
      onOpenTestResult={onOpenTestResult}
    />
  );

export default TreeViewNode;
