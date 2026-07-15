import { useEffect, useRef } from 'react';

export type SortOption =
  | 'alphabetical'
  | 'most-activity'
  | 'code-declaration'
  | 'non-discarded-first'
  | 'discarded-first';

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'alphabetical',       label: 'Alphabetically' },
  { value: 'most-activity',      label: 'Most activity first' },
  { value: 'code-declaration',   label: 'Code Declaration' },
  { value: 'non-discarded-first',label: 'Non-discarded first' },
  { value: 'discarded-first',    label: 'Discarded first' },
];

interface Props {
  value: SortOption;
  onChange: (v: SortOption) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

const SortMenu: React.FC<Props> = ({ value, onChange, onClose, anchorRef }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 bg-base-19 py-2 w-48"
      style={{ boxShadow: '0px 2px 16px 0px rgba(0,0,0,0.36)' }}
    >
      {OPTIONS.map(opt => (
        <div
          key={opt.value}
          className="flex items-center gap-2 px-3 h-6 cursor-pointer"
          onClick={() => { onChange(opt.value); onClose(); }}
        >
          <span
            className="shrink-0 size-4 rounded-full border flex items-center justify-center"
            style={{ borderColor: opt.value === value ? 'var(--color-blue-06)' : 'var(--color-base-11)' }}
          >
            {opt.value === value && (
              <span className="size-2 rounded-full bg-white" />
            )}
          </span>
          <span
            className="text-[13px]"
            style={{ color: opt.value === value ? 'var(--color-base-01)' : 'var(--color-base-06)' }}
          >
            {opt.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SortMenu;
