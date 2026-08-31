import { forwardRef } from 'react';

export type ContextMenuTarget =
  | { type: 'package'; testPackage: TestPackage }
  | { type: 'suite'; workspaceId: string; packageName: string; suite: TestSuite }
  | { type: 'group'; workspaceId: string; packageName: string; suiteName: string; node: TestTreeGroupNode }
  | { type: 'test'; node: TestTreeTestNode };

interface ContextMenuProps {
  x: number;
  y: number;
  runDisabled: boolean;
  onRun: () => void;
  showRefresh: boolean;
  refreshDisabled: boolean;
  onRefresh: () => void;
  showViewLocation: boolean;
  onViewLocation: () => void;
}

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(({
  x,
  y,
  runDisabled,
  onRun,
  showRefresh,
  refreshDisabled,
  onRefresh,
  showViewLocation,
  onViewLocation,
}, ref) => {
  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault();
  };

  return (
    <div ref={ref} onContextMenu={handleContextMenu} style={{ top: y, left: x }} className="fixed z-20 w-44 bg-base-19 shadow-lg py-2">
      <button
        type="button"
        disabled={runDisabled}
        className={`flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left ${
          runDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'
        }`}
        onClick={onRun}
      >
        <i className="codicon codicon-run-all" />
        <span>Run Tests</span>
      </button>
      {showRefresh &&
        <button
          type="button"
          disabled={refreshDisabled}
          className={`flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left ${
            refreshDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'
          }`}
          onClick={onRefresh}
        >
          <i className="codicon codicon-refresh" />
          <span>Refresh Tests</span>
        </button>
      }
      {showViewLocation &&
        <button
          type="button"
          className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
          onClick={onViewLocation}
        >
          <i className="codicon codicon-go-to-file" />
          <span>View in source file</span>
        </button>
      }
    </div>
  );
});

export default ContextMenu;
