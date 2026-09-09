import { useEffect, useRef, useState } from 'react';

const FILTER_OPTIONS = [
  { label: 'Failed Rounds', value: 'failed-rounds' },
  { label: 'Skipped Rounds', value: 'skipped-rounds' },
  { label: 'Transactions with Mints', value: 'mint-transactions' }
];

interface Props {
  selectedFilter: string | null;
  onSelectFilter: (value: string) => void;
}

const Toolbar: React.FC<Props> = ({ selectedFilter, onSelectFilter }) => {
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
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleToggleMenu = () => setIsMenuOpen(open => !open);

  const hasActiveFilter = selectedFilter !== null;

  return (
    <div className="flex-none p-2 flex flex-row justify-end items-center gap-2 bg-base-18">
      <span ref={wrapperRef} className="relative inline-flex items-center">
        <button
          className={
            'flex items-center justify-center rounded-[4px] border cursor-pointer ' +
            (hasActiveFilter ?
              'bg-[var(--vscode-inputOption-activeBackground)] border-[var(--vscode-inputOption-activeBorder)]' :
              isMenuOpen ?
                'bg-[var(--vscode-inputOption-hoverBackground)] border-transparent' :
                'border-transparent hover:bg-[var(--vscode-inputOption-hoverBackground)]')
          }
          onClick={handleToggleMenu}
        >
          <i
            className={
              'codicon p-[1px] ' +
              (hasActiveFilter ?
                'codicon-filter text-[var(--vscode-inputOption-activeForeground)]' :
                isMenuOpen ?
                  'codicon-filter text-[var(--vscode-inputOption-activeForeground)]' :
                  'codicon-filter text-[var(--vscode-icon-foreground)] hover:text-[var(--vscode-inputOption-activeForeground)]')
            }
          />
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-base-19 shadow-lg py-2">
            {FILTER_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
                onClick={() => onSelectFilter(option.value)}
              >
                <i className={`codicon codicon-check ${option.value === selectedFilter ? 'opacity-100' : 'opacity-0'}`} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </span>
    </div>
  );
};

export default Toolbar;
