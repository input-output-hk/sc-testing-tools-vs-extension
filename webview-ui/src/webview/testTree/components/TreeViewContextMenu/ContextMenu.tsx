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

const ICON_GAP = '  ';
const ICON_RUN_ALL = '';
const ICON_REFRESH = '';
const ICON_TASKLIST = '';
const ICON_COVERAGE = '';
const ICON_GO_TO_FILE = '';

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
  if (isRunnable) items.push({ label: `${ICON_RUN_ALL}${ICON_GAP}Run Tests`, value: 'run' });
  if (isBuildable && isBuildEnabled) items.push({ label: `${ICON_REFRESH}${ICON_GAP}Refresh Test Tree`, value: 'build' });
  if (hasResults) items.push({ label: `${ICON_TASKLIST}${ICON_GAP}View Results`, value: 'results' });
  if (hasCoverage) items.push({ label: `${ICON_COVERAGE}${ICON_GAP}View Test Coverage`, value: 'coverage' });
  if (hasLocation) items.push({ label: `${ICON_GO_TO_FILE}${ICON_GAP}View in source file`, value: 'location' });

  if (items.length === 0) return null;

  return (
    <div ref={ref} onContextMenu={handleContextMenu} style={{ top: y, left: x }} className="fixed z-20 [--afv-menu-font:var(--vscode-font-family)]">
      <VscodeContextMenu show data={items} onVscContextMenuSelect={handleSelect} className="[--vscode-font-family:var(--afv-menu-font),codicon]" />
    </div>
  );
});

export default ContextMenu;
