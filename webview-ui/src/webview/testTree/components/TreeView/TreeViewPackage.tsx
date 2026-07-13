import { useMemo } from 'react';

import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewSuite from './TreeViewSuite';
import useTreeItemState from './useTreeItemState';
import { suiteMatchesFilter, suiteMatchesStatus } from '../../utils/treeUtils';

interface TreeViewPackageProps {
  tests: TestList;
  package: TestPackage;
  filterText: string;
  statusFilter: TestStatus | null;
  onRunTest: (testIds: Array<string>) => void;
  onBuildTestSuiteTree: (packageName: string, suiteName: string) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
  onUpdateSelection: (testIds: Array<string>, selected: boolean) => void;
}

const TreeViewPackage: React.FC<TreeViewPackageProps> = ({
  package: pkg,
  tests,
  filterText,
  statusFilter,
  onRunTest,
  onBuildTestSuiteTree,
  onToggleTreeGroup,
  onUpdateSelection,
}) => {
  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onToggleTreeGroup([pkg.name], !isCollapsed);
    },
  });

  const effectiveFilterText =
    !filterText || pkg.name.toLowerCase().includes(filterText.toLowerCase()) ? '' : filterText;

  const filteredSuiteKeys = useMemo(
    () =>
      Object.keys(pkg.suites).filter(
        (key) =>
          suiteMatchesStatus(pkg.suites[key], statusFilter, tests) &&
          (!effectiveFilterText || suiteMatchesFilter(pkg.suites[key], effectiveFilterText, tests)),
      ),
    [pkg.suites, effectiveFilterText, statusFilter, tests],
  );

  return (
    <VscodeTreeItem ref={treeItemRef} open={pkg.isOpen}>
      <i className="codicon codicon-package" />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {pkg.name}
        </span>
      </span>
      {filteredSuiteKeys.map((key) => (
        <TreeViewSuite
          key={key}
          suite={pkg.suites[key]}
          path={[pkg.name, key]}
          tests={tests}
          filterText={effectiveFilterText}
          statusFilter={statusFilter}
          onRunTest={onRunTest}
          onBuildTestSuiteTree={onBuildTestSuiteTree}
          onToggleTreeGroup={onToggleTreeGroup}
          onUpdateSelection={onUpdateSelection}
        />
      ))}
    </VscodeTreeItem>
  );
};

export default TreeViewPackage;
