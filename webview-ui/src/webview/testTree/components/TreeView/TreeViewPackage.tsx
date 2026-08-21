import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewSuite from './TreeViewSuite';
import TestStatusIcon from '../../../../components/TestStatusIcon';
import useTreeItemState from '../../../../hooks/useTreeItemState';
import { suiteMatchesFilter, suiteMatchesStatus, getPackageStatus } from '../../utils/treeUtils';

interface TreeViewPackageProps {
  testPackage: TestPackage;
  filterText: string;
  statusFilter: RunStatus | null;
  onRunTests: (testIds: Array<RunTestId>) => void;
  onBuildSuite: (suiteId: TestSuiteId) => void;
  onUpdateSelection: (testIds: Array<RunTestId>, selected: boolean) => void;
  onUpdateOpenTestTreeNode: (
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ) => void;
  onOpenTestResult: (testId: TestId) => void;
}

const TreeViewPackage: React.FC<TreeViewPackageProps> = ({
  testPackage,
  filterText,
  statusFilter,
  onRunTests,
  onBuildSuite,
  onUpdateSelection,
  onUpdateOpenTestTreeNode,
  onOpenTestResult,
}) => {
  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onUpdateOpenTestTreeNode(!isCollapsed, testPackage.workspace.id, testPackage.name);
    },
  });

  const effectiveFilterText =
    !filterText || testPackage.name.toLowerCase().includes(filterText.toLowerCase()) ? '' : filterText;

  const filteredSuites = useMemo(
    () =>
      Object.values(testPackage.suites).filter(
        (suite) =>
          suiteMatchesStatus(suite, statusFilter) &&
          (!effectiveFilterText || suiteMatchesFilter(suite, effectiveFilterText)),
      ),
    [testPackage.suites, effectiveFilterText, statusFilter],
  );

  const handleBuildPackage = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    Object.values(testPackage.suites).forEach(suite => {
      onBuildSuite([testPackage.workspace.id, testPackage.name, suite.name]);
    });
  };

  const handleRunPackage = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onRunTests(Object.values(testPackage.suites).map(suite => [testPackage.workspace.id, testPackage.name, suite.name]));
  };

  return (
    <VscodeTreeItem ref={treeItemRef} open={testPackage.isOpen}>
      <TestStatusIcon status={getPackageStatus(testPackage)} />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {testPackage.name}
        </span>
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
          onClickCapture={handleBuildPackage}
        >
          <i className="codicon codicon-refresh" />
        </button>
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
          onClickCapture={handleRunPackage}
        >
          <i className="codicon codicon-run-all" />
        </button>
      </span>
      {filteredSuites.map((suite) => (
        <TreeViewSuite
          key={suite.name}
          workspaceId={testPackage.workspace.id}
          packageName={testPackage.name}
          suite={suite}
          filterText={effectiveFilterText}
          statusFilter={statusFilter}
          onRunTests={onRunTests}
          onBuildSuite={onBuildSuite}
          onUpdateSelection={onUpdateSelection}
          onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
          onOpenTestResult={onOpenTestResult}
        />
      ))}
    </VscodeTreeItem>
  );
};

export default TreeViewPackage;
