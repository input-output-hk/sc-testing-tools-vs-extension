import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeViewNode';
import useSyncedSpin from './useSyncedSpin';
import useTreeItemState from './useTreeItemState';
import { nodeMatchesFilter, nodeMatchesStatus } from '../../utils/treeUtils';

interface TreeViewSuiteProps {
  tests: TestList;
  path: Array<string>;
  suite: TestSuite;
  filterText: string;
  statusFilter: TestStatus | null;
  onRunTest: (testIds: Array<string>) => void;
  onBuildTestSuiteTree: (packageName: string, suiteName: string) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
  onUpdateSelection: (testIds: Array<string>, selected: boolean) => void;
}

const TreeViewSuite: React.FC<TreeViewSuiteProps> = ({
  suite,
  path,
  tests,
  filterText,
  statusFilter,
  onRunTest,
  onBuildTestSuiteTree,
  onToggleTreeGroup,
  onUpdateSelection,
}) => {
  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onToggleTreeGroup(path, !isCollapsed);
    },
  });

  const spinRef = useSyncedSpin();

  const effectiveFilterText =
    !filterText || suite.name.toLowerCase().includes(filterText.toLowerCase()) ? '' : filterText;

  const filteredNodeKeys = useMemo(
    () =>
      Object.keys(suite.tree).filter(
        (key) =>
          nodeMatchesStatus(suite.tree[key], statusFilter, tests) &&
          (!effectiveFilterText || nodeMatchesFilter(suite.tree[key], effectiveFilterText, tests)),
      ),
    [suite.tree, effectiveFilterText, statusFilter, tests],
  );

  return (
    <VscodeTreeItem ref={treeItemRef} open={suite.isOpen}>
      <i className="codicon codicon-project" />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {suite.name}
        </span>
        {suite.status !== 'building' &&
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
            onClickCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.nativeEvent.stopImmediatePropagation();
              onBuildTestSuiteTree(path[0], path[1]);
            }}
          >
            <i className="codicon codicon-symbol-property" />
          </button>
        }
        {suite.status === 'building' &&
          <i ref={spinRef} className="codicon codicon-loading origin-[50%_40%] h-5 w-5" />
        }
      </span>
      {filteredNodeKeys.map((key) => (
        <TreeViewNode
          key={key}
          node={suite.tree[key]}
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

export default TreeViewSuite;
