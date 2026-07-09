import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewNode from './TreeViewNode';
import useTreeItemState from './useTreeItemState';

interface TreeViewSuiteProps {
  tests: TestList;
  path: Array<string>;
  suite: TestSuite;
  onRunTest: (testIds: Array<string>) => void;
  onBuildTestSuiteTree: (packageName: string, suiteName: string) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
  onUpdateSelection: (testIds: Array<string>, selected: boolean) => void;
}

const TreeViewSuite: React.FC<TreeViewSuiteProps> = ({ suite, path, tests, onRunTest, onBuildTestSuiteTree, onToggleTreeGroup, onUpdateSelection }) => {
  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onToggleTreeGroup(path, !isCollapsed);
    },
  });

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
          <i className="codicon codicon-loading h-5 w-5 animate-spin" />
        }
      </span>
      {Object.keys(suite.tree).map((key, index) =>
        <TreeViewNode
          key={index}
          node={suite.tree[key]}
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

export default TreeViewSuite;