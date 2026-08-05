import { useEffect, useMemo, useRef, useState } from 'react';

import { VscodeTree } from '@vscode-elements/react-elements';

import TreeViewPackage from './TreeViewPackage';
import FilterMenu from './FilterMenu';
import { packageMatchesFilter, packageMatchesStatus, isRunnableTestId } from '../../utils/treeUtils';

interface TreeViewProps {
  testTree: TestTree;
  onRunTests: (testIds: Array<RunTestId>) => void;
  onUpdateOpenTestTreeNode: (
    isOpen: boolean,
    workspaceId: string,
    packageName: string,
    suiteName?: string,
    path?: Array<string>
  ) => void;
}

const TreeView: React.FC<TreeViewProps> = ({ testTree, onRunTests, onUpdateOpenTestTreeNode }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<RunStatus | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterWrapperRef = useRef<HTMLSpanElement | null>(null);

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
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
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

  const handleUpdateSelection = (testIds: Array<RunTestId>, selected: boolean) => {
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

  const handleRunTests = (testIds: Array<RunTestId>) => {
    const testRun: Set<string> = new Set();
    const runnableIds = testIds.filter(isRunnableTestId).map(id => id.join(':'));
    if (runnableIds.some(id => selected.has(id))) {
      for (const selectedId of selected) {
        testRun.add(selectedId);
      }
    } else if (runnableIds.length > 0) {
      for (const runnableId of runnableIds) {
        testRun.add(runnableId);
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
      onRunTests(Array.from(testRun).map(id => id.split(':') as RunTestId));
    }
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
              onRunTests={handleRunTests}
              onUpdateSelection={handleUpdateSelection}
              onUpdateOpenTestTreeNode={onUpdateOpenTestTreeNode}
            />
          ))}
        </VscodeTree>
      </div>
    </div>
  );
};

export default TreeView;
