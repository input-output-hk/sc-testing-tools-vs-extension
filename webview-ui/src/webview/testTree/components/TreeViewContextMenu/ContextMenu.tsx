import { forwardRef } from 'react';

interface Props {
  x: number;
  y: number;
  isRunnable: boolean;
  isBuildable: boolean;
  isBuildEnabled: boolean;
  hasLocation: boolean;
  onRun: () => void;
  onBuild: () => void;
  onShowLocation: () => void;
}

const ContextMenu: React.FC<Props & React.RefAttributes<HTMLDivElement>> = forwardRef<HTMLDivElement, Props>(({
  x,
  y,
  isRunnable,
  isBuildable,
  isBuildEnabled,
  hasLocation,
  onRun,
  onBuild,
  onShowLocation,
}, ref) => {
  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault();
  };

  return (
    <div ref={ref} onContextMenu={handleContextMenu} style={{ top: y, left: x }} className="fixed z-20 w-44 bg-base-19 shadow-lg py-2">
      <button
        type="button"
        disabled={!isRunnable}
        className={`flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left ${
          !isRunnable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'
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
            !isBuildEnabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'
          }`}
          onClick={onBuild}
        >
          <i className="codicon codicon-refresh" />
          <span>Refresh Tests</span>
        </button>
      }
      {hasLocation &&
        <button
          type="button"
          className="flex items-center gap-1 w-full px-3 py-1 border-0 bg-transparent text-left cursor-pointer hover:bg-white/10"
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
