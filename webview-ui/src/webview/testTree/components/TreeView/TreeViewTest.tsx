import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TestStatusIcon from '../../../../components/TestStatusIcon';

interface TreeViewTestProps {
  node: TreeTestNode;
  testList: TestList;
  onRunTest: (testIds: Array<number>) => void;
}

const TreeViewTest: React.FC<TreeViewTestProps> = ({ node, testList, onRunTest }) => {
  const test = testList[node.testId];

  const handleRunTest = () => onRunTest([test.id]);

  return (
    <VscodeTreeItem>
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
            onClickCapture={handleRunTest}
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
