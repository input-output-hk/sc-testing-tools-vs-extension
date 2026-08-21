import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeViewNode';
import TestStatusIcon from '../../../../components/TestStatusIcon';
import useTreeItemState from '../../../../hooks/useTreeItemState';
import { nodeMatchesFilter, nodeMatchesStatus } from '../../utils/treeUtils';

interface TreeViewSuiteProps {
  workspaceId: string;
  packageName: string;
  suite: TestSuite;
  filterText: string;
  statusFilter: RunStatus | null;
  onRunTests: (testIds: Array<RunTestId>) => void;
  onBuildSuite: (suiteId: TestSuiteId) => void;
  onUpdateSelection: (testIds: Array<RunTestId>, selected: boolean) => void;
  onUpdateOpenTestTreeNode: (
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ) => void;
  onOpenTestResult: (testId: TestId) => void;
}

const TreeViewSuite: React.FC<TreeViewSuiteProps> = ({
  workspaceId,
  packageName,
  suite,
  filterText,
  statusFilter,
  onRunTests,
  onBuildSuite,
  onUpdateSelection,
  onUpdateOpenTestTreeNode,
  onOpenTestResult,
}) => {
  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onUpdateOpenTestTreeNode(!isCollapsed, workspaceId, packageName, suite.name);
    },
    onToggleSelection: (selected) => {
      onUpdateSelection([[workspaceId, packageName, suite.name]], selected);
    },
  });

  const effectiveFilterText =
    !filterText || suite.name.toLowerCase().includes(filterText.toLowerCase()) ? '' : filterText;

  const filteredNodes = useMemo(
    () =>
      Object.values(suite.tests).filter(
        (node) =>
          nodeMatchesStatus(node, statusFilter) &&
          (!effectiveFilterText || nodeMatchesFilter(node, effectiveFilterText)),
      ),
    [suite.tests, effectiveFilterText, statusFilter],
  );

  const handleRunSuite = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onRunTests([[workspaceId, packageName, suite.name]]);
  };

  const handleBuildSuite = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onBuildSuite([workspaceId, packageName, suite.name]);
  };

  return (
    <VscodeTreeItem ref={treeItemRef} open={suite.isOpen}>
      <TestStatusIcon status={suite.status} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {suite.name}
        </span>
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
          onClickCapture={handleBuildSuite}
        >
          <i className="codicon codicon-refresh" />
        </button>
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
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
          onRunTests={onRunTests}
          onUpdateSelection={onUpdateSelection}
          onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
          onOpenTestResult={onOpenTestResult}
        />
      ))}
    </VscodeTreeItem>
  );
};

export default TreeViewSuite;
