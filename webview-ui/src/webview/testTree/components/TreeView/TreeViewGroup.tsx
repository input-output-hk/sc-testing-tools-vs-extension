import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeViewNode';
import useTreeItemState from './useTreeItemState';

interface TreeViewGroupProps {
  node: TestTreeGroupNode;
  path: Array<string>;
  tests: TestList;
  onRunTest: (testIds: Array<string>) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
  onUpdateSelection: (testIds: Array<string>, selected: boolean) => void;
}

const getGroupTestIds = (group: TestTreeGroupNode): Array<string> => {
  const testIds: Array<string> = [];
  for (const node of Object.values(group.nodes)) {
    if (node.type === 'test') {
      testIds.push((node as TestTreeTestNode).testId);
    } else if (node.type === 'group') {
      testIds.push(...getGroupTestIds(node as TestTreeGroupNode));
    }
  }
  return testIds;
};

const TreeViewGroup: React.FC<TreeViewGroupProps> = ({ node, path, tests, onRunTest, onToggleTreeGroup, onUpdateSelection }) => {
  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onToggleTreeGroup(path, !isCollapsed);
    },
    onToggleSelection: (selected) => {
      onUpdateSelection(getGroupTestIds(node), selected);
    },
  });

  return (
    <VscodeTreeItem ref={treeItemRef} open={node.isOpen}>
      <i className="codicon codicon-folder translate-y-1" slot="icon-branch" />
      <i className="codicon codicon-folder-opened translate-y-1" slot="icon-branch-opened" />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {node.name}
        </span>
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
          onClickCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
            onRunTest(getGroupTestIds(node));
          }}
        >
          <i className="codicon codicon-run-all" />
        </button>
      </span>
      {Object.keys(node.nodes).map((key, index) =>
        <TreeViewNode
          key={index}
          node={node.nodes[key]}
          path={[...path, key]}
          tests={tests}
          onRunTest={onRunTest}
          onToggleTreeGroup={onToggleTreeGroup}
          onUpdateSelection={onUpdateSelection}
        />
      )}
    </VscodeTreeItem>
  );
};

export default TreeViewGroup;