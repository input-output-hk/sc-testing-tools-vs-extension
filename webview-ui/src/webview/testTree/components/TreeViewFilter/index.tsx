import { useEffect, useRef, useState } from 'react';

import FilterMenu from './FilterMenu';

interface Props {
  filter: TestTreeFilter;
  placeholder?: string;
  onChangeFilter: (filter: TestTreeFilter) => void;
  onClear?: () => void;
}

const TreeViewFilter: React.FC<Props> = ({ filter, placeholder = 'Filter (e.g. test)', onChangeFilter, onClear }) => {
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
        className={`w-full pl-2 ${onClear !== undefined ? 'pr-12' : 'pr-6'} py-1 text-sm rounded-[var(--vscode-cornerRadius-small)] border border-[var(--vscode-commandCenter-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]`}
        placeholder={placeholder}
        value={filter.text ?? ''}
        onChange={handleFilterTextInput}
      />
      <span
        ref={wrapperRef}
        className="absolute right-3 inline-flex items-center gap-1"
      >
        {onClear !== undefined && (
          <i
            className="codicon codicon-clear-all cursor-pointer opacity-70 hover:opacity-100"
            onClick={onClear}
            data-tooltip-id="tree-node-action"
            data-tooltip-content="Clear"
          />
        )}
        <i
          className={
            `codicon cursor-pointer hover:opacity-100 ` +
            (filter.status !== undefined || filter.type !== undefined ?
              'codicon-filter-filled text-blue-06 opacity-100' : 'codicon-filter opacity-70')
          }
          onClick={handleFilterToggle}
          data-tooltip-id="tree-node-action"
          data-tooltip-content="Filter"
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
