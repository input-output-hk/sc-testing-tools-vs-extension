import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeViewNode';
import useTreeItemState from '../../../../hooks/useTreeItemState';
import TestStatusIcon from '../../../../components/TestStatusIcon';
import {
  getGroupTests,
  getGroupTestIds,
  getGroupStatus,
  nodeMatchesFilter,
  nodeMatchesStatus,
  isRunnableTestId,
  sortTreeNodes,
} from '../../utils/treeUtils';

interface TreeViewGroupProps {
  workspaceId: string;
  packageName: string;
  suiteName: string;
  node: TestTreeGroupNode;
  path: Array<string>;
  filterText: string;
  statusFilter: RunStatus | null;
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

const TreeViewGroup: React.FC<TreeViewGroupProps> = ({
  workspaceId,
  packageName,
  suiteName,
  node,
  path,
  filterText,
  statusFilter,
  onRunTest,
  onUpdateSelection,
  onUpdateOpenTestTreeNode,
  onOpenTestResult,
}) => {
  const isThreatModel = node.name.toLowerCase() === 'threat models';

  const isRunnable = useMemo(
    () => getGroupTests(node).some(test => isRunnableTestId(test.id) && test.status !== 'running' && test.status !== 'waiting'),
    [node],
  );

  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onUpdateOpenTestTreeNode(!isCollapsed, workspaceId, packageName, suiteName, [...path, node.name]);
    },
    onToggleSelection: (selected) => {
      onUpdateSelection(getGroupTestIds(node), selected);
    },
  });

  const effectiveFilterText =
    !filterText || node.name.toLowerCase().includes(filterText.toLowerCase())
      ? ''
      : filterText;

  const filteredNodes = useMemo(
    () =>
      Object.values(node.nodes).filter(
        (childNode) =>
          nodeMatchesStatus(childNode, statusFilter) &&
          nodeMatchesFilter(childNode, effectiveFilterText),
      )
      .sort(sortTreeNodes),
    [node.nodes, effectiveFilterText, statusFilter],
  );

  const handleRunGroup = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onRunTest(getGroupTestIds(node));
  };

  return (
    <VscodeTreeItem ref={treeItemRef} open={node.isOpen}>
      <TestStatusIcon status={getGroupStatus(node)} isThreatModel={isThreatModel} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {node.name}
          {isThreatModel &&
            <span className="ml-1 opacity-60">
              ({Object.keys(node.nodes).length})
            </span>
          }
        </span>
        <button
          type="button"
          className={`flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 ${
            isRunnable ? 'opacity-60 hover:opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
          }`}
          disabled={!isRunnable}
          onClickCapture={handleRunGroup}
        >
          <i className="codicon codicon-run-all" />
        </button>
      </span>
      {filteredNodes.map((childNode) => (
        <TreeViewNode
          key={childNode.type === 'group'
            ? (childNode as TestTreeGroupNode).name
            : (childNode as TestTreeTestNode).test.id.join(':')}
          workspaceId={workspaceId}
          packageName={packageName}
          suiteName={suiteName}
          node={childNode}
          path={[...path, node.name]}
          filterText={effectiveFilterText}
          statusFilter={statusFilter}
          onRunTest={onRunTest}
          onUpdateSelection={onUpdateSelection}
          onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
          onOpenTestResult={onOpenTestResult}
        />
      ))}
    </VscodeTreeItem>
  );
};

export default TreeViewGroup;
