import { useEffect, useRef, useState } from 'react';

import FilterMenu from './FilterMenu';

interface Props {
  filter: TestTreeFilter;
  onChangeFilter: (filter: TestTreeFilter) => void;
}

const TreeViewFilter: React.FC<Props> = ({ filter, onChangeFilter }) => {
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

  const handleFilterTextInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFilter({ ...filter, text: event.target.value });
  };

  const handleFilterToggle = () => {
    setIsMenuOpen((open) => !open);
  };

  const handleChangeFilter = (nextFilter: TestTreeFilter) => {
    onChangeFilter(nextFilter);
    setIsMenuOpen(false);
  };

  return (
    <div className="relative flex items-center w-full px-2 py-2">
      <input
        type="text"
        className="w-full pl-2 pr-6 py-1 text-sm rounded border border-transparent dark:bg-[#3c3c3c] dark:text-base-06 outline-none focus:border-blue-06 dark:placeholder:text-base-06"
        placeholder="Filter (e.g. test)"
        value={filter.text ?? ''}
        onChange={handleFilterTextInput}
      />
      <span
        ref={wrapperRef}
        className="absolute right-3 inline-flex items-center"
      >
        <i
          className={
            `codicon cursor-pointer hover:opacity-100 ` +
            (filter.status !== undefined || filter.type !== undefined ?
              'codicon-filter-filled text-blue-06 opacity-100' : 'codicon-filter opacity-70')
          }
          onClick={handleFilterToggle}
        />
        <FilterMenu
          isOpen={isMenuOpen}
          filter={filter}
          onChangeFilter={handleChangeFilter}
        />
      </span>
    </div>
  );
};

export default TreeViewFilter;
