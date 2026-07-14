import { useState } from 'react';
import { VscodeTree } from '@vscode-elements/react-elements';

import TreeViewPackage from './TreeViewPackage';

interface TreeViewProps {
  tests: TestList;
  packages: TestPackageList;
  onRunTest: (testIds: Array<string>) => void;
  onBuildTestSuiteTree: (packageName: string, suiteName: string) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
}

const TreeView: React.FC<TreeViewProps> = ({ tests, packages, onRunTest, onBuildTestSuiteTree, onToggleTreeGroup }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const onUpdateSelection = (testIds: Array<string>, selected: boolean) => {
    setSelected((prevSelected) => {
      const joinedTestIds = testIds.join(',');
      const newSelected = new Set(prevSelected);
      if (selected) {
        newSelected.add(joinedTestIds);
      } else {
        newSelected.delete(joinedTestIds);
      }
      return newSelected;
    });
  };

  const handleRunTest = (testIds: Array<string>) => {
    if (selected.has(testIds.join(','))) {
      const testRun: Set<string> = new Set();
      for (const selectedTestIds of selected) {
        for (const testId of selectedTestIds.split(',')) {
          testRun.add(testId);
        }
      }
      onRunTest(Array.from(testRun));
    } else {
      onRunTest(testIds);
    }
  };

  return (
    <div className="h-full overflow-y-scroll">
      <VscodeTree multiSelect>
        {Object.values(packages).map((pkg, index) =>
          <TreeViewPackage
            key={index}
            package={pkg}
            tests={tests}
            onRunTest={handleRunTest}
            onBuildTestSuiteTree={onBuildTestSuiteTree}
            onToggleTreeGroup={onToggleTreeGroup}
            onUpdateSelection={onUpdateSelection}
          />
        )}
      </VscodeTree>
    </div>
  );
};

export default TreeView;