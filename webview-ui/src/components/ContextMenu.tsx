import { useState, useEffect, useLayoutEffect, useRef } from 'react';

export interface ContextMenuItem<T> {
  value: T;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface Props<T> {
  position: ContextMenuPosition | null;
  items: Array<ContextMenuItem<T>>;
  onSelect: (value: T) => void;
  onClose: () => void;
}

interface RowProps<T> {
  item: ContextMenuItem<T>;
  onSelect: (value: T) => void;
}

const EDGE = 4;

const fitToViewport = (start: number, size: number, viewport: number): number => {
  const flipped = start + size > viewport ? start - size : start;
  return Math.max(EDGE, Math.min(flipped, viewport - size - EDGE));
};

const ContextMenuRow = <T,>({ item, onSelect }: RowProps<T>) => {
  const handleClick = (): void => {
    onSelect(item.value);
  };

  return (
    <button
      type="button"
      disabled={item.disabled}
      className={`flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left ${
        item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-(--vscode-menu-selectionBackground) hover:text-(--vscode-menu-selectionForeground)'
      }`}
      onClick={handleClick}
    >
      {item.content}
    </button>
  );
};

const ContextMenu = <T,>({ position, items, onSelect, onClose }: Props<T>) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [adjusted, setAdjusted] = useState<ContextMenuPosition | null>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!position || !menu) {
      setAdjusted(null);
      return;
    }
    const { width, height } = menu.getBoundingClientRect();
    setAdjusted({
      x: fitToViewport(position.x, width, window.innerWidth),
      y: fitToViewport(position.y, height, window.innerHeight),
    });
  }, [position, items]);

  useEffect(() => {
    if (!position) return;

    const handleDocumentClick = (event: MouseEvent): void => {
      const menu = menuRef.current;
      if (menu && !menu.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleWindowBlur = (): void => {
      onClose();
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
  }, [position, onClose]);

  if (!position || items.length === 0) return null;

  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault();
  };

  const handleSelect = (value: T): void => {
    onSelect(value);
    onClose();
  };

  const { x, y } = adjusted ?? position;

  return (
    <div ref={menuRef} onContextMenu={handleContextMenu} style={{ top: y, left: x }} className="fixed z-20 min-w-44 py-2 text-[13px] whitespace-nowrap bg-(--vscode-menu-background) text-(--vscode-menu-foreground) rounded-(--vscode-cornerRadius-large) border border-(--vscode-menu-border) shadow-(--vscode-context-view-menu-motion-shadow)">
      {items.map((item, index) => (
        <ContextMenuRow key={index} item={item} onSelect={handleSelect} />
      ))}
    </div>
  );
};

export default ContextMenu;
