import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeViewNode';
import useTreeItemState from './useTreeItemState';
import { getGroupRunnableTestIds, getGroupTestIds, nodeMatchesFilter, nodeMatchesStatus, getGroupStatus } from '../../utils/treeUtils';
import TestStatusIcon from '../../../../components/TestStatusIcon';

interface TreeViewGroupProps {
  node: TestTreeGroupNode;
  path: Array<string>;
  tests: TestList;
  filterText: string;
  statusFilter: TestStatus | null;
  onRunTest: (testIds: Array<string>) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
  onUpdateSelection: (testIds: Array<string>, selected: boolean) => void;
}

const TreeViewGroup: React.FC<TreeViewGroupProps> = ({
  node,
  path,
  tests,
  filterText,
  statusFilter,
  onRunTest,
  onToggleTreeGroup,
  onUpdateSelection,
}) => {
  const isThreatModel = node.name.toLowerCase() === 'threat models';

  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onToggleTreeGroup(path, !isCollapsed);
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
      Object.keys(node.nodes).filter(
        (key) =>
          nodeMatchesStatus(node.nodes[key], statusFilter, tests) &&
          nodeMatchesFilter(node.nodes[key], effectiveFilterText, tests),
      ),
    [node.nodes, effectiveFilterText, statusFilter, tests],
  );

  const runnableFilteredTestIds = useMemo(() => {
    const visibleNodes = Object.fromEntries(
      filteredNodes.map((key) => [key, node.nodes[key]]),
    );
    return getGroupRunnableTestIds({ ...node, nodes: visibleNodes }, tests);
  }, [filteredNodes, node, tests]);

  const handleRunGroup = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    if (runnableFilteredTestIds.length === 0) return;
    onRunTest(runnableFilteredTestIds);
  };

  return (
    <VscodeTreeItem ref={treeItemRef} open={node.isOpen}>
      <TestStatusIcon status={getGroupStatus(node, tests)} isThreatModel={isThreatModel} />
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
            runnableFilteredTestIds.length > 0
              ? 'opacity-60 hover:opacity-100 cursor-pointer'
              : 'opacity-30 cursor-not-allowed'
          }`}
          disabled={runnableFilteredTestIds.length === 0}
          onClickCapture={handleRunGroup}
        >
          <i className="codicon codicon-run-all" />
        </button>
      </span>
      {filteredNodes.map((key) => (
        <TreeViewNode
          key={key}
          node={node.nodes[key]}
          path={[...path, key]}
          tests={tests}
          filterText={effectiveFilterText}
          statusFilter={statusFilter}
          onRunTest={onRunTest}
          onToggleTreeGroup={onToggleTreeGroup}
          onUpdateSelection={onUpdateSelection}
        />
      ))}
    </VscodeTreeItem>
  );
};

export default TreeViewGroup;
