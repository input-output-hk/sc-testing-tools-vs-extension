import { useEffect, useMemo, useRef, useState } from 'react';

import { VscodeTree } from '@vscode-elements/react-elements';

import TreeViewPackage from './TreeViewPackage';
import FilterMenu from './FilterMenu';
import { packageMatchesFilter, packageMatchesStatus } from '../../utils/treeUtils';

interface TreeViewProps {
  tests: TestList;
  packages: TestPackageList;
  onRunTest: (testIds: Array<string>) => void;
  onBuildTestSuiteTree: (packageName: string, suiteName: string) => void;
  onToggleTreeGroup: (path: Array<string>, isOpen: boolean) => void;
}

const TreeView: React.FC<TreeViewProps> = ({ tests, packages, onRunTest, onBuildTestSuiteTree, onToggleTreeGroup }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestStatus | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterWrapperRef = useRef<HTMLSpanElement | null>(null);

  const handleFilterInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
  };

  const handleFilterToggle = () => {
    setIsFilterMenuOpen((open) => !open);
  };

  const handleStatusFilterChange = (nextStatusFilter: TestStatus | null) => {
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

  const filteredPackageKeys = useMemo(
    () =>
      Object.keys(packages).filter(
        (key) =>
          packageMatchesStatus(packages[key], statusFilter, tests) &&
          (!filterText || packageMatchesFilter(packages[key], filterText, tests)),
      ),
    [packages, filterText, statusFilter, tests],
  );

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
    <div className="h-full flex flex-col">
      <div className="relative flex items-center w-full px-2 py-2">
        <input
          type="text"
          className="w-full pl-2 pr-6 py-1 text-sm rounded border border-transparent bg-[#3c3c3c] text-base-06 outline-none focus:border-blue-06 placeholder:text-base-06"
          placeholder="Filter (e.g. test)"
          value={filterText}
          onChange={handleFilterInput}
        />
        <span ref={filterWrapperRef} className="absolute right-3 inline-flex items-center">
          <i
            className={`codicon cursor-pointer hover:opacity-100 ${statusFilter !== null ? 'codicon-filter-filled text-blue-06 opacity-100' : 'codicon-filter text-base-06 opacity-70'}`}
            onClick={handleFilterToggle}
          />
          <FilterMenu isOpen={isFilterMenuOpen} statusFilter={statusFilter} onChange={handleStatusFilterChange} />
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <VscodeTree multiSelect>
          {filteredPackageKeys.map((key) => (
            <TreeViewPackage
              key={key}
              package={packages[key]}
              tests={tests}
              filterText={filterText}
              statusFilter={statusFilter}
              onRunTest={handleRunTest}
              onBuildTestSuiteTree={onBuildTestSuiteTree}
              onToggleTreeGroup={onToggleTreeGroup}
              onUpdateSelection={onUpdateSelection}
            />
          ))}
        </VscodeTree>
      </div>
    </div>
  );
};

export default TreeView;
