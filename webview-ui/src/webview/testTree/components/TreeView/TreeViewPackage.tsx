import { VscodeTreeItem } from '@vscode-elements/react-elements';

import TreeViewSuite from './TreeViewSuite';
import useTreeItemState from './useTreeItemState';

interface TreeViewPackageProps {
  tests: TestList;
  package: TestPackage;
  onRunTest: (testIds: Array<string>) => void;
  onBuildTestSuiteTree: (packageName: string, suiteName: string) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
  onUpdateSelection: (testIds: Array<string>, selected: boolean) => void;
}

const TreeViewPackage: React.FC<TreeViewPackageProps> = ({ package: pkg, tests, onRunTest, onBuildTestSuiteTree, onToggleTreeGroup, onUpdateSelection }) => {
  const treeItemRef = useTreeItemState({
    onToggleCollapsed: (isCollapsed) => {
      onToggleTreeGroup([pkg.name], !isCollapsed);
    },
  });

  return (
    <VscodeTreeItem ref={treeItemRef} open={pkg.isOpen}>
      <i className="codicon codicon-package" />
      <span className="flex flex-row w-full items-center justify-between gap-0.5">
        <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          {pkg.name}
        </span>
      </span>
      {Object.keys(pkg.suites).map((key, index) =>
        <TreeViewSuite
          key={index}
          suite={pkg.suites[key]}
          path={[pkg.name, key]}
          tests={tests}
          onRunTest={onRunTest}
          onBuildTestSuiteTree={onBuildTestSuiteTree}
          onToggleTreeGroup={onToggleTreeGroup}
          onUpdateSelection={onUpdateSelection}
        />
      )}
    </VscodeTreeItem>
  );
};

export default TreeViewPackage;