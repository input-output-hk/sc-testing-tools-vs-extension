import { forwardRef } from 'react';

interface Props {
  x: number;
  y: number;
  isRunnable: boolean;
  isBuildable: boolean;
  isBuildEnabled: boolean;
  hasLocation: boolean;
  hasResults: boolean;
  hasCoverage: boolean;
  onRun: () => void;
  onBuild: () => void;
  onShowLocation: () => void;
  onViewResults: () => void;
  onViewCoverage: () => void;
}

const ContextMenu: React.FC<Props & React.RefAttributes<HTMLDivElement>> = forwardRef<HTMLDivElement, Props>(({
  x,
  y,
  isRunnable,
  isBuildable,
  isBuildEnabled,
  hasLocation,
  hasResults,
  hasCoverage,
  onRun,
  onBuild,
  onShowLocation,
  onViewResults,
  onViewCoverage,
}, ref) => {
  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault();
  };

  return (
    <div ref={ref} onContextMenu={handleContextMenu} style={{ top: y, left: x }} className="fixed z-20 w-44 py-2 text-[13px] bg-(--vscode-menu-background) text-(--vscode-menu-foreground) rounded-(--vscode-cornerRadius-large) border border-(--vscode-menu-border) shadow-(--vscode-context-view-menu-motion-shadow)">
      <button
        type="button"
        disabled={!isRunnable}
        className={`flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left ${
          !isRunnable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-(--vscode-menu-selectionBackground) hover:text-(--vscode-menu-selectionForeground)'
        }`}
        onClick={onRun}
      >
        <i className="codicon codicon-run-all" />
        <span>Run Tests</span>
      </button>
      {isBuildable &&
        <button
          type="button"
          disabled={!isBuildEnabled}
          className={`flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left ${
            !isBuildEnabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-(--vscode-menu-selectionBackground) hover:text-(--vscode-menu-selectionForeground)'
          }`}
          onClick={onBuild}
        >
          <i className="codicon codicon-refresh" />
          <span>Refresh Test Tree</span>
        </button>
      }
      {hasResults &&
        <button
          type="button"
          className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-(--vscode-menu-selectionBackground) hover:text-(--vscode-menu-selectionForeground)"
          onClick={onViewResults}
        >
          <i className="codicon codicon-tasklist" />
          <span>View Results</span>
        </button>
      }
      {hasCoverage &&
        <button
          type="button"
          className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-(--vscode-menu-selectionBackground) hover:text-(--vscode-menu-selectionForeground)"
          onClick={onViewCoverage}
        >
          <i className="codicon codicon-coverage" />
          <span>View Test Coverage</span>
        </button>
      }
      {hasLocation &&
        <button
          type="button"
          className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-(--vscode-menu-selectionBackground) hover:text-(--vscode-menu-selectionForeground)"
          onClick={onShowLocation}
        >
          <i className="codicon codicon-go-to-file" />
          <span>View in source file</span>
        </button>
      }
    </div>
  );
});

export default ContextMenu;
