import { forwardRef } from 'react';

export type ContextMenuTarget =
  | { kind: 'package'; testPackage: TestPackage }
  | { kind: 'suite'; workspaceId: string; packageName: string; suite: TestSuite }
  | { kind: 'group'; workspaceId: string; packageName: string; suiteName: string; node: TestTreeGroupNode }
  | { kind: 'test'; node: TestTreeTestNode };

interface ContextMenuProps {
  x: number;
  y: number;
  showRun: boolean;
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
  showRun,
  runDisabled,
  onRun,
  showRefresh,
  refreshDisabled,
  onRefresh,
  showViewLocation,
  onViewLocation,
}, ref) => (
  <div ref={ref} style={{ top: y, left: x }} className="fixed z-20 w-44 bg-base-19 shadow-lg py-2">
    {showRun &&
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
    }
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
        <span>View Location</span>
      </button>
    }
  </div>
));

export default ContextMenu;
