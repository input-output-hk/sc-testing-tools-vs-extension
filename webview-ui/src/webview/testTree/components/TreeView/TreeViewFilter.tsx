import { useEffect, useRef, useState } from 'react';

import FilterMenu from './FilterMenu';

interface TreeViewFilterProps {
  filterText: string;
  statusFilter: RunStatus | null;
  typeFilter: TestType | null;
  onFilterTextChange: (value: string) => void;
  onStatusFilterChange: (statusFilter: RunStatus | null) => void;
  onTypeFilterChange: (typeFilter: TestType | null) => void;
}

const TreeViewFilter: React.FC<TreeViewFilterProps> = ({
  filterText,
  statusFilter,
  typeFilter,
  onFilterTextChange,
  onStatusFilterChange,
  onTypeFilterChange,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper && !wrapper.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('contextmenu', handleDocumentClick, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('contextmenu', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleFilterInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilterTextChange(event.target.value);
  };

  const handleFilterToggle = () => {
    setIsMenuOpen((open) => !open);
  };

  const handleStatusFilterChange = (nextStatusFilter: RunStatus | null) => {
    onStatusFilterChange(nextStatusFilter);
    setIsMenuOpen(false);
  };

  const handleTypeFilterChange = (nextTypeFilter: TestType | null) => {
    onTypeFilterChange(nextTypeFilter);
    setIsMenuOpen(false);
  };

  return (
    <div className="relative flex items-center w-full px-2 py-2">
      <input
        type="text"
        className="w-full pl-2 pr-6 py-1 text-sm rounded border border-transparent dark:bg-[#3c3c3c] dark:text-base-06 outline-none focus:border-blue-06 dark:placeholder:text-base-06"
        placeholder="Filter (e.g. test)"
        value={filterText}
        onChange={handleFilterInput}
      />
      <span
        ref={wrapperRef}
        className="absolute right-3 inline-flex items-center"
      >
        <i
          className={`codicon cursor-pointer hover:opacity-100 ${statusFilter !== null || typeFilter !== null ? 'codicon-filter-filled text-blue-06 opacity-100' : 'codicon-filter opacity-70'}`}
          onClick={handleFilterToggle}
        />
        <FilterMenu
          isOpen={isMenuOpen}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          onChangeStatus={handleStatusFilterChange}
          onChangeType={handleTypeFilterChange}
        />
      </span>
    </div>
  );
};

export default TreeViewFilter;
