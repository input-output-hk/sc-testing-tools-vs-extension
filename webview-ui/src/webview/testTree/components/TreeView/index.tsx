import { useEffect, useMemo, useRef, useState } from 'react';

import { VscodeTree } from '@vscode-elements/react-elements';

import TreeViewPackage from './TreeViewPackage';
import FilterMenu from './FilterMenu';
import ContextMenu, { type ContextMenuTarget } from './ContextMenu';
import {
  packageMatchesFilter,
  packageMatchesStatus,
  isRunnableTestId,
  isRunnableStatus,
  isTestRunnable,
  isSelectionEntryRunnable,
  getPackageStatus,
  getGroupTests,
  getGroupTestIds,
} from '../../utils/treeUtils';

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

const TreeView: React.FC<TreeViewProps> = ({ testTree, onRunTest, onBuildTestSuite, onUpdateOpenTestTreeNode, onOpenTestResult, onShowTestLocation }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<RunStatus | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: ContextMenuTarget } | null>(null);
  const filterWrapperRef = useRef<HTMLSpanElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const handleFilterInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
  };

  const handleFilterToggle = () => {
    setIsFilterMenuOpen((open) => !open);
  };

  const handleStatusFilterChange = (nextStatusFilter: RunStatus | null) => {
    setStatusFilter(nextStatusFilter);
    setIsFilterMenuOpen(false);
  };

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const wrapper = filterWrapperRef.current;
      if (wrapper && !wrapper.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
      const menu = contextMenuRef.current;
      if (menu && !menu.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterMenuOpen(false);
        setContextMenu(null);
      }
    };
    const handleWindowBlur = () => {
      setContextMenu(null);
    };

    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('contextmenu', handleDocumentClick, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('contextmenu', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  const filteredPackages = useMemo(
    () =>
      Object.values(testTree.packages).filter(
        testPackage =>
          packageMatchesStatus(testPackage, statusFilter) &&
          (!filterText || packageMatchesFilter(testPackage, filterText)),
      ),
    [testTree.packages, filterText, statusFilter],
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
    for (const id of Array.from(testRun)) {
      if (!isSelectionEntryRunnable(testTree, id)) {
        testRun.delete(id);
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

  const handleContextMenu = (event: React.MouseEvent, target: ContextMenuTarget): void => {
    setContextMenu({ x: event.clientX, y: event.clientY, target });
  };

  const closeContextMenu = (): void => setContextMenu(null);

  const getRunTargetIds = (target: ContextMenuTarget): Array<RunnableTestId> => {
    switch (target.type) {
      case 'package':
        return Object.values(target.testPackage.suites).map(
          (suite): TestSuiteId => [target.testPackage.workspace.id, target.testPackage.name, suite.name]
        );
      case 'suite':
        return [[target.workspaceId, target.packageName, target.suite.name]];
      case 'group':
        return getGroupTestIds(target.node);
      case 'test':
        return [target.node.test.id];
    }
  };

  const getTargetSelectionKey = (target: ContextMenuTarget): string | null => {
    switch (target.type) {
      case 'suite':
        return [target.workspaceId, target.packageName, target.suite.name].join(':');
      case 'test':
        return target.node.test.id.join(':');
      default:
        return null;
    }
  };

  const isTargetRunnable = (target: ContextMenuTarget): boolean => {
    switch (target.type) {
      case 'package':
        return isRunnableStatus(getPackageStatus(target.testPackage));
      case 'suite':
        return isRunnableStatus(target.suite.status);
      case 'group':
        return getGroupTests(target.node).some(isTestRunnable);
      case 'test':
        return isTestRunnable(target.node.test);
    }
  };

  const isContextMenuRunDisabled = (target: ContextMenuTarget): boolean => {
    const key = getTargetSelectionKey(target);
    if (key !== null && selected.has(key) && selected.size > 1) {
      return Array.from(selected).every(id => !isSelectionEntryRunnable(testTree, id));
    }
    return !isTargetRunnable(target);
  };

  const isContextMenuRefreshDisabled = (target: ContextMenuTarget): boolean =>
    target.type === 'package'
      ? !isRunnableStatus(getPackageStatus(target.testPackage))
      : target.type === 'suite' && !isRunnableStatus(target.suite.status);

  const isContextMenuViewLocationVisible = (target: ContextMenuTarget): boolean => {
    console.log('isContextMenuViewLocationVisible target', target);
    if (target.type !== 'test') return false;
    console.log('isContextMenuViewLocationVisible test node', target.node);
    const key = target.node.test.id.join(':');
    console.log('isContextMenuViewLocationVisible key', key, 'selected', selected);
    const effectiveSize = selected.has(key) ? selected.size : 1;
    console.log('isContextMenuViewLocationVisible effectiveSize', effectiveSize, 'location', target.node.test.location);
    return effectiveSize === 1 && target.node.test.location !== undefined;
  };

  const isContextMenuRefreshVisible = (target: ContextMenuTarget): boolean =>
    target.type === 'suite' || target.type === 'package';

  const handleContextMenuRun = (): void => {
    if (!contextMenu) return;
    handleRunTest(getRunTargetIds(contextMenu.target));
    closeContextMenu();
  };

  const handleContextMenuRefresh = (): void => {
    if (!contextMenu) return;
    const { target } = contextMenu;
    if (target.type === 'suite') {
      onBuildTestSuite([target.workspaceId, target.packageName, target.suite.name]);
    } else if (target.type === 'package') {
      Object.values(target.testPackage.suites).forEach(suite =>
        onBuildTestSuite([target.testPackage.workspace.id, target.testPackage.name, suite.name])
      );
    }
    closeContextMenu();
  };

  const handleContextMenuViewLocation = (): void => {
    if (!contextMenu || contextMenu.target.type !== 'test') return;
    onShowTestLocation(contextMenu.target.node.test.id);
    closeContextMenu();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="relative flex items-center w-full px-2 py-2">
        <input
          type="text"
          className="w-full pl-2 pr-6 py-1 text-sm rounded border border-transparent dark:bg-[#3c3c3c] dark:text-base-06 outline-none focus:border-blue-06 dark:placeholder:text-base-06"
          placeholder="Filter (e.g. test)"
          value={filterText}
          onChange={handleFilterInput}
        />
        <span ref={filterWrapperRef} className="absolute right-3 inline-flex items-center">
          <i
            className={`codicon cursor-pointer hover:opacity-100 ${statusFilter !== null ? 'codicon-filter-filled text-blue-06 opacity-100' : 'codicon-filter opacity-70'}`}
            onClick={handleFilterToggle}
          />
          <FilterMenu isOpen={isFilterMenuOpen} statusFilter={statusFilter} onChange={handleStatusFilterChange} />
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <VscodeTree multiSelect>
          {filteredPackages.map((testPackage) => (
            <TreeViewPackage
              key={testPackage.name}
              testPackage={testPackage}
              filterText={filterText}
              statusFilter={statusFilter}
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
      {contextMenu &&
        <ContextMenu
          ref={contextMenuRef}
          x={contextMenu.x}
          y={contextMenu.y}
          showRun
          runDisabled={isContextMenuRunDisabled(contextMenu.target)}
          onRun={handleContextMenuRun}
          showRefresh={isContextMenuRefreshVisible(contextMenu.target)}
          refreshDisabled={isContextMenuRefreshDisabled(contextMenu.target)}
          onRefresh={handleContextMenuRefresh}
          showViewLocation={isContextMenuViewLocationVisible(contextMenu.target)}
          onViewLocation={handleContextMenuViewLocation}
        />
      }
    </div>
  );
};

export default TreeView;
