import { useEffect, useRef, useState } from 'react';
import { VscodeContextMenu } from '@vscode-elements/react-elements';

const FILTER_OPTIONS = [
  { label: 'Failed Transactions', value: 'failed-transactions' },
  { label: 'Potential Counterexample', value: 'potential-counterexample' },
  { label: 'Mint Transactions', value: 'mint-transactions' },
  { label: 'Transactions with Attacks', value: 'transactions-with-attacks' }
];

const buildLabel = (label: string, isSelected: boolean): string =>
  (isSelected ? '✓   ' : '    ') + label;

const Toolbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
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
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleToggleMenu = () => setIsMenuOpen(open => !open);

  const handleSelectFilter = (event: CustomEvent<{ value: string }>) => {
    const { value } = event.detail;
    setSelectedFilter(current => current === value ? null : value);
  };

  const hasActiveFilter = selectedFilter !== null;

  const data = FILTER_OPTIONS.map(option => ({
    label: buildLabel(option.label, option.value === selectedFilter),
    value: option.value
  }));

  return (
    <div className="flex-none p-2 flex flex-row justify-end items-center gap-2 bg-base-18">
      <span ref={wrapperRef} className="relative inline-flex items-center">
        <button
          className={
            'w-7 h-7 flex items-center justify-center rounded-md border cursor-pointer ' +
            (hasActiveFilter ?
              'bg-blue-08 border-blue-04' :
              isMenuOpen ?
                'bg-white/10 border-transparent' :
                'border-transparent hover:bg-white/10 active:bg-white/15')
          }
          onClick={handleToggleMenu}
        >
          <i
            className={
              'codicon ' +
              (hasActiveFilter ?
                'codicon-filter-filled opacity-100' :
                isMenuOpen ?
                  'codicon-filter opacity-100' :
                  'codicon-filter opacity-70 hover:opacity-100')
            }
          />
        </button>
        <VscodeContextMenu
          className="absolute right-0 top-full mt-1 z-10 w-64"
          style={{
            '--vscode-menu-selectionBackground': 'rgba(255, 255, 255, 0.1)',
            '--vscode-menu-selectionForeground': 'var(--vscode-menu-foreground, #cccccc)'
          } as React.CSSProperties}
          show={isMenuOpen}
          data={data}
          onVscContextMenuSelect={handleSelectFilter}
        />
      </span>
    </div>
  );
};

export default Toolbar;
