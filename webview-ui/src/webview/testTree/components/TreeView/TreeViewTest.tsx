import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TestStatusIcon from '../../../../components/TestStatusIcon';
import { isRunnableTestId } from '../../utils/treeUtils';
import useTreeItemState from './useTreeItemState';

interface TreeViewTestProps {
  node: TestTreeTestNode;
  path: Array<string>;
  onRunTests: (testIds: Array<RunTestId>) => void;
  onUpdateSelection: (testIds: Array<RunTestId>, selected: boolean) => void;
}

const formatTestTime = (time: number): string => {
  if (time < 1000) {
    return `${time.toFixed(2)}ms`;
  } else {
    return `${(time / 1000).toFixed(2)}s`;
  }
};

const TreeViewTest: React.FC<TreeViewTestProps> = ({
  node,
  path,
  onRunTests,
  onUpdateSelection,
}) => {
  const isRunnable = isRunnableTestId(node.test.id);
  const isThreatModel = path.length > 0 && path[path.length - 1].toLowerCase() === 'threat models';

  const treeItemRef = useTreeItemState({
    onToggleSelection: (selected) => {
      onUpdateSelection([node.test.id], selected);
    },
  });

  return (
    <VscodeTreeItem ref={treeItemRef}>
      <TestStatusIcon status={node.test.status} isThreatModel={isThreatModel} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {node.test.name}
          {(node.test.time !== undefined && node.test.time > 0) &&
            <span className="ml-1 opacity-60">
              {formatTestTime(node.test.time)}
            </span>
           || (node.test.percentage !== undefined && node.test.percentage > 0) &&
            <span className="ml-1 opacity-60">
              {node.test.percentage.toFixed(0)}%
            </span>
          }
        </span>
        <button
          type="button"
          className={`flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 ${
            isRunnable ? 'opacity-60 hover:opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
          }`}
          disabled={!isRunnable}
          onClickCapture={() => {
            if (isRunnable) onRunTests([node.test.id]);
          }}
        >
          <i className="codicon codicon-play" />
        </button>
      </span>
    </VscodeTreeItem>
  );
};

export default TreeViewTest;
