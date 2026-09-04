import { useMemo, useState, useRef } from 'react';
import { VscodeTree } from '@vscode-elements/react-elements';

import TreeViewPackage from './TreeViewPackage';
import TreeViewFilter from '../TreeViewFilter';
import TreeViewContextMenu, { type TreeViewContextMenuRef } from '../TreeViewContextMenu';
import Tooltip from '../../../../components/Tooltip';
import { packageMatchesFilter, isRunnableTestId } from '../../utils/treeUtils';

interface TreeViewProps {
  testTree: TestTree;
  onRunTest: (testIds: Array<RunnableTestId>) => void;
  onBuildTestSuite: (suiteId: TestSuiteId) => void;
  onUpdateOpenTestTreeNode: (
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ) => void;
  onOpenTestResult: (testId: TestId) => void;
  onShowTestLocation: (testId: TestId) => void;
}

const TreeView: React.FC<TreeViewProps> = ({
  testTree,
  onRunTest,
  onBuildTestSuite,
  onUpdateOpenTestTreeNode,
  onOpenTestResult,
  onShowTestLocation
}) => {
  const contextMenuRef = useRef<TreeViewContextMenuRef>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<TestTreeFilter>({});

  const filteredPackages = useMemo(
    () =>
      Object.values(testTree.packages)
        .filter(testPackage => packageMatchesFilter(testPackage, filter)),
    [testTree.packages, filter],
  );

  const handleUpdateSelection = (testIds: Array<RunnableTestId>, selected: boolean) => {
    setSelected((prevSelected) => {
      const newSelected = new Set(prevSelected);
      for (const testId of testIds) {
        if (isRunnableTestId(testId)) {
          if (selected) {
            newSelected.add(testId.join(':'));
          } else {
            newSelected.delete(testId.join(':'));
          }
        }
      }
      return newSelected;
    });
  };

  const handleRunTest = (testIds: Array<RunnableTestId>) => {
    const runnableIds = testIds.filter(isRunnableTestId).map(id => id.join(':'));
    const testRun: Set<string> = new Set(runnableIds);
    if (runnableIds.some(id => selected.has(id))) {
      for (const selectedId of selected) {
        testRun.add(selectedId);
      }
    }
    if (testRun.size > 0) {
      const removeIds = new Set<string>(
        Array.from(testRun).filter(id => !id.split(':')[3])
      );
      for (const testRunId of testRun) {
        const [workspaceId, packageName, suiteName, testId] = testRunId.split(':');
        if (testId && removeIds.has([workspaceId, packageName, suiteName].join(':'))) {
          testRun.delete(testRunId);
        }
      }
      onRunTest(Array.from(testRun).map(id => id.split(':') as RunnableTestId));
    }
  };

  const handleContextMenu = (event: React.MouseEvent, item: TestTreeItem): void => {
    contextMenuRef.current?.open(event, item);
  };

  return (
    <div className="h-full flex flex-col">
      <TreeViewFilter
        filter={filter}
        onChangeFilter={setFilter}
      />
      <div className="flex-1 overflow-y-auto">
        <VscodeTree multiSelect>
          {filteredPackages.map(testPackage => (
            <TreeViewPackage
              key={testPackage.name}
              testPackage={testPackage}
              filter={filter}
              onRunTest={handleRunTest}
              onBuildTestSuite={onBuildTestSuite}
              onUpdateSelection={handleUpdateSelection}
              onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
              onOpenTestResult={onOpenTestResult}
              onShowTestLocation={onShowTestLocation}
              onContextMenu={handleContextMenu}
            />
          ))}
        </VscodeTree>
      </div>
      <TreeViewContextMenu
        ref={contextMenuRef}
        onRunTest={handleRunTest}
        onBuildTestSuite={onBuildTestSuite}
        onShowTestLocation={onShowTestLocation}
      />
      <Tooltip id="tree-node-action" place="left" />
    </div>
  );
};

export default TreeView;
