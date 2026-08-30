import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeViewNode';
import TestStatusIcon from '../../../../components/TestStatusIcon';
import useTreeItemState from '../../../../hooks/useTreeItemState';
import {
  nodeMatchesFilter,
  nodeMatchesStatus,
  nodeMatchesType,
  formatTestTime
} from '../../utils/treeUtils';

interface TreeViewSuiteProps {
  workspaceId: string;
  packageName: string;
  suite: TestSuite;
  filterText: string;
  statusFilter: RunStatus | null;
  typeFilter: TestType | null;
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
  onShowTestLocation: (testId: TestId) => void;
}

const TreeViewSuite: React.FC<TreeViewSuiteProps> = ({
  workspaceId,
  packageName,
  suite,
  filterText,
  statusFilter,
  typeFilter,
  onRunTest,
  onBuildTestSuite,
  onUpdateSelection,
  onUpdateOpenTestTreeNode,
  onOpenTestResult,
  onShowTestLocation,
}) => {
  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onUpdateOpenTestTreeNode(!isCollapsed, workspaceId, packageName, suite.name);
    },
    onToggleSelection: (selected) => {
      onUpdateSelection([[workspaceId, packageName, suite.name]], selected);
    },
  });

  const isRunnable = suite.status !== 'running' && suite.status !== 'waiting';

  const effectiveFilterText =
    !filterText || suite.name.toLowerCase().includes(filterText.toLowerCase()) ? '' : filterText;

  const filteredNodes = useMemo(
    () =>
      Object.values(suite.tests).filter(
        (node) =>
          nodeMatchesStatus(node, statusFilter) &&
          nodeMatchesType(node, typeFilter) &&
          (!effectiveFilterText || nodeMatchesFilter(node, effectiveFilterText)),
      ),
    [suite.tests, effectiveFilterText, statusFilter, typeFilter],
  );

  const handleRunSuite = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onRunTest([[workspaceId, packageName, suite.name]]);
  };

  const handleBuildSuite = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onBuildTestSuite([workspaceId, packageName, suite.name]);
  };

  return (
    <VscodeTreeItem ref={treeItemRef} open={suite.isOpen}>
      <TestStatusIcon status={suite.status} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {suite.name}
          {suite.time !== undefined && suite.time > 0 &&
            <span className="ml-1 opacity-60">
              {formatTestTime(suite.time)}
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
        >
          <i className="codicon codicon-run-all" />
        </button>
      </span>
      {filteredNodes.map((node) => (
        <TreeViewNode
          key={node.type === 'group'
            ? (node as TestTreeGroupNode).name
            : (node as TestTreeTestNode).test.id.join(':')}
          workspaceId={workspaceId}
          packageName={packageName}
          suiteName={suite.name}
          node={node}
          path={[]}
          filterText={effectiveFilterText}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          onRunTest={onRunTest}
          onUpdateSelection={onUpdateSelection}
          onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
          onOpenTestResult={onOpenTestResult}
          onShowTestLocation={onShowTestLocation}
        />
      ))}
    </VscodeTreeItem>
  );
};

export default TreeViewSuite;
