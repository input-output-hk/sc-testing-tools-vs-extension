import TreeViewGroup from './TreeViewGroup';
import TreeViewTest from './TreeViewTest';

interface TreeViewNodeProps {
  suiteId: TestSuiteId;
  node: TestTreeNode;
  path: Array<string>;
  filter: TestTreeFilter;
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
  onShowTestLocation: (testId: TestId) => void;
  onContextMenu: (event: React.MouseEvent, item: TestTreeItem) => void;
}

const TreeViewNode: React.FC<TreeViewNodeProps> = ({
  suiteId,
  node,
  path,
  filter,
  onRunTest,
  onUpdateSelection,
  onUpdateOpenTestTreeNode,
  onOpenTestResult,
  onShowTestLocation,
  onContextMenu,
}) =>
  node.type === 'group' ? (
    <TreeViewGroup
      suiteId={suiteId}
      node={node as TestTreeGroupNode}
      path={path}
      filter={filter}
      onRunTest={onRunTest}
      onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
      onUpdateSelection={onUpdateSelection}
      onOpenTestResult={onOpenTestResult}
      onShowTestLocation={onShowTestLocation}
      onContextMenu={onContextMenu}
    />
  ) : (
    <TreeViewTest
      node={node as TestTreeTestNode}
      path={path}
      onRunTest={onRunTest}
      onUpdateSelection={onUpdateSelection}
      onOpenTestResult={onOpenTestResult}
      onShowTestLocation={onShowTestLocation}
      onContextMenu={onContextMenu}
    />
  );

export default TreeViewNode;
