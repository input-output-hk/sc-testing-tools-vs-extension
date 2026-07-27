import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeViewNode';
import TestStatusIcon from '../../../../components/TestStatusIcon';
import useTreeItemState from './useTreeItemState';
import { nodeMatchesFilter, nodeMatchesStatus, getSuiteStatus } from '../../utils/treeUtils';

interface TreeViewSuiteProps {
  tests: TestList;
  path: Array<string>;
  suite: TestSuite;
  filterText: string;
  statusFilter: TestStatus | null;
  onRunTest: (testIds: Array<string>) => void;
  onRunTestSuite: (packageName: string, suiteName: string) => void;
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
  onRunTestSuite,
  onToggleTreeGroup,
  onUpdateSelection,
}) => {
  const [packageName, suiteName] = path;

  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onToggleTreeGroup(path, !isCollapsed);
    },
  });

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
      <TestStatusIcon status={getSuiteStatus(packageName, suiteName, tests)} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {suite.name}
        </span>
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
          onClickCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
            onRunTestSuite(packageName, suiteName);
          }}
        >
          <i className="codicon codicon-run-all" />
        </button>
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
