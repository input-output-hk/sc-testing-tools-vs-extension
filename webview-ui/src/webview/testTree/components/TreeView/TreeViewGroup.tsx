import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeViewNode';
import TestStatusIcon from '../../../../components/TestStatusIcon';
import useTreeItemState from '../../../../hooks/useTreeItemState';
import {
  getGroupTests,
  getGroupTestIds,
  getGroupTime,
  getGroupStatus,
  nodeMatchesFilter,
  isTestRunnable,
  sortTreeNodes,
  formatTestTime,
} from '../../utils/treeUtils';

interface TreeViewGroupProps {
  suiteId: TestSuiteId;
  node: TestTreeGroupNode;
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

const TreeViewGroup: React.FC<TreeViewGroupProps> = ({
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
}) => {
  const [workspaceId, packageName, suiteName] = suiteId;
  const time = getGroupTime(node);
  const status = getGroupStatus(node);
  const isThreatModel = node.name.toLowerCase() === 'threat models';

  const isRunnable = useMemo(
    () => getGroupTests(node).some(isTestRunnable),
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

  const filteredNodes = useMemo(
    () =>
      Object.values(node.nodes)
        .filter(node => nodeMatchesFilter(node, filter))
        .sort(sortTreeNodes),
    [node.nodes, filter]
  );

  const handleRunGroup = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onRunTest(getGroupTestIds(node));
  };

  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, { type: 'node', node });
  };

  return (
    <VscodeTreeItem ref={treeItemRef} open={node.isOpen} onContextMenu={handleContextMenu}>
      <TestStatusIcon status={status} isThreatModel={isThreatModel} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {node.name}
          {isThreatModel &&
            <span className="ml-1 opacity-60">
              ({Object.keys(node.nodes).length})
            </span>
          }
          {time > 0 && status !== 'running' && status !== 'waiting' &&
            <span className="ml-1 opacity-60">
              {formatTestTime(time)}
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
          data-tooltip-id="tree-node-action"
          data-tooltip-content="Run Tests"
        >
          <i className="codicon codicon-run-all" />
        </button>
      </span>
      {filteredNodes.map((childNode) => (
        <TreeViewNode
          key={childNode.type === 'group'
            ? (childNode as TestTreeGroupNode).name
            : (childNode as TestTreeTestNode).test.id.join(':')}
          suiteId={suiteId}
          node={childNode}
          path={[...path, node.name]}
          filter={filter}
          onRunTest={onRunTest}
          onUpdateSelection={onUpdateSelection}
          onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
          onOpenTestResult={onOpenTestResult}
          onShowTestLocation={onShowTestLocation}
          onContextMenu={onContextMenu}
        />
      ))}
    </VscodeTreeItem>
  );
};

export default TreeViewGroup;
