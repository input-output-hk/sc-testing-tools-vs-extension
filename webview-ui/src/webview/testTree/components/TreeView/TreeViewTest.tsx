import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TestStatusIcon from '../../../../components/TestStatusIcon';
import useTreeItemState from '../../../../hooks/useTreeItemState';
import { isTestRunnable, formatTestTime } from '../../utils/treeUtils';

interface TreeViewTestProps {
  node: TestTreeTestNode;
  path: Array<string>;
  onRunTest: (testIds: Array<RunnableTestId>) => void;
  onUpdateSelection: (testIds: Array<RunnableTestId>, selected: boolean) => void;
  onOpenTestResult: (testId: TestId) => void;
  onOpenCoverage: (testId: TestId, testName: string) => void;
  onShowTestLocation: (testId: TestId) => void;
  onContextMenu: (event: React.MouseEvent, item: TestTreeItem) => void;
}

const TreeViewTest: React.FC<TreeViewTestProps> = ({
  node,
  path,
  onRunTest,
  onUpdateSelection,
  onOpenTestResult,
  onOpenCoverage,
  onShowTestLocation,
  onContextMenu,
}) => {
  const isRunnable = isTestRunnable(node.test);
  const isThreatModel = path.length > 0 && path[path.length - 1].toLowerCase() === 'threat models';

  const treeItemRef = useTreeItemState({
    onToggleSelection: (selected) => {
      onUpdateSelection([node.test.id], selected);
    },
  });

  const handleOpenTestResult = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onOpenTestResult(node.test.id);
  };

  const handleOpenCoverage = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onOpenCoverage(node.test.id, node.test.name);
  };

  const handleRunTest = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    if (isRunnable) onRunTest([node.test.id]);
  };

  const handleShowTestLocation = (event: React.MouseEvent): void => {
    if ((event.target as HTMLElement).closest('button')) return;
    if (node.test.location !== undefined) onShowTestLocation(node.test.id);
  };

  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, { type: 'node', node });
  };

  return (
    <VscodeTreeItem ref={treeItemRef} onClickCapture={handleShowTestLocation} onContextMenu={handleContextMenu}>
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

        {node.test.type !== undefined && node.test.type !== 'unit-test' &&
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
            onClickCapture={handleOpenTestResult}
          >
            <i className="codicon codicon-tasklist" />
          </button>
        }

        {node.test.type !== undefined && node.test.type !== 'unit-test' &&
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
            onClickCapture={handleOpenCoverage}
          >
            <i className="codicon codicon-coverage" />
          </button>
        }

        <button
          type="button"
          className={`flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 ${
            isRunnable ? 'opacity-60 hover:opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
          }`}
          disabled={!isRunnable}
          onClickCapture={handleRunTest}
        >
          <i className="codicon codicon-play" />
        </button>
      </span>
    </VscodeTreeItem>
  );
};

export default TreeViewTest;
