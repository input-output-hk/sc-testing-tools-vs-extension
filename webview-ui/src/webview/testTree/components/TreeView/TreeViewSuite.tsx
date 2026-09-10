import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeViewNode';
import TestStatusIcon from '../../../../components/TestStatusIcon';
import useTreeItemState from '../../../../hooks/useTreeItemState';
import { nodeMatchesFilter } from '../../utils/treeUtils';
import { formatRunTime } from '../../../../utils/format';

interface TreeViewSuiteProps {
  packageId: TestPackageId;
  suite: TestSuite;
  filter: TestTreeFilter;
  onRunTest: (testIds: Array<RunnableTestId>) => void;
  onBuildTestSuite: (suiteId: TestSuiteId) => void;
  onUpdateSelection: (testIds: Array<RunnableTestId>, selected: boolean) => void;
  onUpdateOpenTestTreeNode: (
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ) => void;
  onOpenTestResult: (testId: TestId) => void;
  onShowCoverage: (testId: TestId, testName: string) => void;
  onShowTestLocation: (testId: TestId) => void;
  onContextMenu: (event: React.MouseEvent, item: TestTreeItem) => void;
}

const TreeViewSuite: React.FC<TreeViewSuiteProps> = ({
  packageId,
  suite,
  filter,
  onRunTest,
  onBuildTestSuite,
  onUpdateSelection,
  onUpdateOpenTestTreeNode,
  onOpenTestResult,
  onShowCoverage,
  onShowTestLocation,
  onContextMenu,
}) => {
  const [workspaceId, packageName] = packageId;
  const suiteId: TestSuiteId = [workspaceId, packageName, suite.name];
  const isRunnable = !suite.isRunning && !suite.isWaiting;

  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onUpdateOpenTestTreeNode(!isCollapsed, workspaceId, packageName, suite.name);
    },
    onToggleSelection: (selected) => {
      onUpdateSelection([suiteId], selected);
    },
  });

  const filteredNodes = useMemo(
    () =>
      Object.values(suite.tests)
        .filter(node => nodeMatchesFilter(node, filter)),
    [suite.tests, filter],
  );

  const handleRunSuite = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onRunTest([suiteId]);
  };

  const handleBuildSuite = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onBuildTestSuite(suiteId);
  };

  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, { type: 'suite', suiteId, suiteNode: suite });
  };

  return (
    <VscodeTreeItem ref={treeItemRef} open={suite.isOpen} onContextMenu={handleContextMenu}>
      <TestStatusIcon
        status={{
          status: suite.status,
          isWaiting: suite.isWaiting,
          isRunning: suite.isRunning
        }}
      />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span
          className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis"
          data-tooltip-id="tree-node-name"
          data-node-name={suite.name}
        >
          {suite.name}
          {suite.time !== undefined && suite.time > 0 &&
            <span className="ml-1 opacity-60">
              {formatRunTime(suite.time)}
            </span>
          }
        </span>
        <button
          type="button"
          className={`flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 ${
            isRunnable ? 'opacity-60 hover:opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
          }`}
          disabled={!isRunnable}
          onClickCapture={handleBuildSuite}
          data-tooltip-id="tree-node-action"
          data-tooltip-content="Refresh Test Tree"
        >
          <i className="codicon codicon-refresh" />
        </button>
        <button
          type="button"
          className={`flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 ${
            isRunnable ? 'opacity-60 hover:opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
          }`}
          disabled={!isRunnable}
          onClickCapture={handleRunSuite}
          data-tooltip-id="tree-node-action"
          data-tooltip-content="Run Tests"
        >
          <i className="codicon codicon-run-all" />
        </button>
      </span>
      {filteredNodes.map((node) => (
        <TreeViewNode
          key={node.type === 'group'
            ? (node as TestTreeGroupNode).name
            : (node as TestTreeTestNode).test.id.join(':')}
          suiteId={suiteId}
          node={node}
          path={[]}
          filter={filter}
          onRunTest={onRunTest}
          onUpdateSelection={onUpdateSelection}
          onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
          onOpenTestResult={onOpenTestResult}
          onShowCoverage={onShowCoverage}
          onShowTestLocation={onShowTestLocation}
          onContextMenu={onContextMenu}
        />
      ))}
    </VscodeTreeItem>
  );
};

export default TreeViewSuite;
