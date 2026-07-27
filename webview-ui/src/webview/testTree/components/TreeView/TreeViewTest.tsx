import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TestStatusIcon from '../../../../components/TestStatusIcon';
import useTreeItemState from './useTreeItemState';

interface TreeViewTestProps {
  node: TestTreeTestNode;
  path: Array<string>;
  tests: TestList;
  onRunTest: (testIds: Array<string>) => void;
  onUpdateSelection: (testIds: Array<string>, selected: boolean) => void;
}

const formatTestTime = (time: number): string => {
  if (time < 1000) {
    return `${time.toFixed(2)}ms`;
  } else {
    return `${(time / 1000).toFixed(2)}s`;
  }
}

const TreeViewTest: React.FC<TreeViewTestProps> = ({ node, path, tests, onRunTest, onUpdateSelection }) => {
  const test = tests[node.testId];
  const canRun = test?.isRunnable === true && test.status !== 'running';
  const isThreatModel = path.length >= 2 && path[path.length - 2].toLowerCase() === 'threat models';

  const treeItemRef = useTreeItemState({
    onToggleSelection: (selected) => {
      onUpdateSelection([node.testId], selected);
    },
  });

  if (!test) return null;

  return (
    <VscodeTreeItem ref={treeItemRef}>
      <TestStatusIcon status={test.status} isThreatModel={isThreatModel} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {test.name}
          {(test.time !== undefined && test.time > 0) &&
            <span className="ml-1 opacity-60">
              {formatTestTime(test.time)}
            </span>
           || (test.percentage !== undefined && test.percentage > 0) &&
            <span className="ml-1 opacity-60">
              {test.percentage.toFixed(0)}%
            </span>
          }
        </span>
        <button
          type="button"
          className={`flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 ${
            canRun ? 'opacity-60 hover:opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
          }`}
          disabled={!canRun}
          onClickCapture={() => {
            if (canRun) onRunTest([test.id]);
          }}
        >
          <i className="codicon codicon-play" />
        </button>
      </span>
    </VscodeTreeItem>
  );
};

export default TreeViewTest;
