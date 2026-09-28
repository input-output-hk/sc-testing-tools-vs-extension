import { forwardRef } from 'react';
import { VscodeContextMenu } from '@vscode-elements/react-elements';
import type { VscContextMenuSelectEvent } from '@vscode-elements/elements/dist/vscode-context-menu/vscode-context-menu.js';

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

interface MenuItem {
  label: string;
  value: string;
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

  const handleSelect = (event: VscContextMenuSelectEvent): void => {
    switch (event.detail.value) {
      case 'run':
        onRun();
        break;
      case 'build':
        onBuild();
        break;
      case 'results':
        onViewResults();
        break;
      case 'coverage':
        onViewCoverage();
        break;
      case 'location':
        onShowLocation();
        break;
    }
  };

  const items: Array<MenuItem> = [];
  if (isRunnable) items.push({ label: 'Run Tests', value: 'run' });
  if (isBuildable && isBuildEnabled) items.push({ label: 'Refresh Test Tree', value: 'build' });
  if (hasResults) items.push({ label: 'View Results', value: 'results' });
  if (hasCoverage) items.push({ label: 'View Test Coverage', value: 'coverage' });
  if (hasLocation) items.push({ label: 'View in source file', value: 'location' });

  if (items.length === 0) return null;

  return (
    <div ref={ref} onContextMenu={handleContextMenu} style={{ top: y, left: x }} className="fixed z-20">
      <VscodeContextMenu show data={items} onVscContextMenuSelect={handleSelect} />
    </div>
  );
});

export default ContextMenu;
