import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TestStatusIcon from '../../../../components/TestStatusIcon';
import useTreeItemState from './useTreeItemState';

interface TreeViewTestProps {
  node: TestTreeTestNode;
  tests: TestList;
  onRunTest: (testIds: Array<string>) => void;
  onUpdateSelection: (testIds: Array<string>, selected: boolean) => void;
}

const TreeViewTest: React.FC<TreeViewTestProps> = ({ node, tests, onRunTest, onUpdateSelection }) => {
  const test = tests[node.testId];

  const treeItemRef = useTreeItemState({
    onToggleSelection: (selected) => {
      onUpdateSelection([node.testId], selected);
    },
  });

  return (
    <VscodeTreeItem ref={treeItemRef}>
      <TestStatusIcon status={test.status} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {test.name}
          {(test.time !== undefined && test.time > 0) &&
            <span className="ml-1 opacity-60">
              {test.time.toFixed(2)}ms
            </span>
          }
        </span>
        {test.status !== 'running' &&
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
            onClickCapture={() => onRunTest([test.id])}
          >
            <i className="codicon codicon-play" />
          </button>
        }
        {test.status === 'running' &&
          <i className="codicon codicon-loading h-5 w-5 animate-spin" />
        }
      </span>
    </VscodeTreeItem>
  );
};

export default TreeViewTest;