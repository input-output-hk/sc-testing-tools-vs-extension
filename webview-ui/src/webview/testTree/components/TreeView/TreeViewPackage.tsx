import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewSuite from './TreeViewSuite';
import TestStatusIcon from '../../../../components/TestStatusIcon';
import useTreeItemState from '../../../../hooks/useTreeItemState';
import {
  suiteMatchesFilter,
  getPackageTime,
  getPackageStatus,
  isRunnableStatus,
  formatTestTime
} from '../../utils/treeUtils';

interface TreeViewPackageProps {
  testPackage: TestPackage;
  filter: TestTreeFilter;
  onRunTest: (testIds: Array<RunnableTestId>) => void;
  onBuildTestSuite: (suiteId: TestSuiteId) => void;
  onUpdateSelection: (testIds: Array<RunnableTestId>, selected: boolean) => void;
  onUpdateOpenTestTreeNode: (
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ) => void;
  onOpenTestResult: (testId: TestId) => void;
  onShowTestLocation: (testId: TestId) => void;
  onContextMenu: (event: React.MouseEvent, item: TestTreeItem) => void;
}

const TreeViewPackage: React.FC<TreeViewPackageProps> = ({
  testPackage,
  filter,
  onRunTest,
  onBuildTestSuite,
  onUpdateSelection,
  onUpdateOpenTestTreeNode,
  onOpenTestResult,
  onShowTestLocation,
  onContextMenu,
}) => {
  const packageId: TestPackageId = [testPackage.workspace.id, testPackage.name];
  const time = getPackageTime(testPackage);
  const status = getPackageStatus(testPackage);
  const isRunnable = isRunnableStatus(status);

  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onUpdateOpenTestTreeNode(!isCollapsed, testPackage.workspace.id, testPackage.name);
    },
  });

  const filteredSuites = useMemo(
    () =>
      Object.values(testPackage.suites)
        .filter(suite => suiteMatchesFilter(suite, filter)),
    [testPackage.suites, filter],
  );

  const handleBuildPackage = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    Object.values(testPackage.suites).forEach(suite => {
      onBuildTestSuite([testPackage.workspace.id, testPackage.name, suite.name]);
    });
  };

  const handleRunPackage = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onRunTest(Object.values(testPackage.suites).map(suite => [testPackage.workspace.id, testPackage.name, suite.name]));
  };

  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, { type: 'package', packageId, packageNode: testPackage });
  };

  return (
    <VscodeTreeItem ref={treeItemRef} open={testPackage.isOpen} onContextMenu={handleContextMenu}>
      <TestStatusIcon status={status} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span
          className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis"
          data-tooltip-id="tree-node-name"
          data-node-name={testPackage.name}
        >
          {testPackage.name}
          {time > 0 &&
            <span className="ml-1 opacity-60">
              {formatTestTime(time)}
            </span>
          }
        </span>
        <button
          type="button"
          className={`flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 ${
            isRunnable ? 'opacity-60 hover:opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
          }`}
          disabled={!isRunnable}
          onClickCapture={handleBuildPackage}
          data-tooltip-id="tree-node-action"
          data-tooltip-content="Refresh Tests"
        >
          <i className="codicon codicon-refresh" />
        </button>
        <button
          type="button"
          className={`flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 ${
            isRunnable ? 'opacity-60 hover:opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
          }`}
          disabled={!isRunnable}
          onClickCapture={handleRunPackage}
          data-tooltip-id="tree-node-action"
          data-tooltip-content="Run Tests"
        >
          <i className="codicon codicon-run-all" />
        </button>
      </span>
      {filteredSuites.map((suite) => (
        <TreeViewSuite
          key={suite.name}
          packageId={packageId}
          suite={suite}
          filter={filter}
          onRunTest={onRunTest}
          onBuildTestSuite={onBuildTestSuite}
          onUpdateSelection={onUpdateSelection}
          onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
          onOpenTestResult={onOpenTestResult}
          onShowTestLocation={onShowTestLocation}
          onContextMenu={onContextMenu}
        />
      ))}
    </VscodeTreeItem>
  );
};

export default TreeViewPackage;
