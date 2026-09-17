import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

import ContextMenu from './ContextMenu';
import { getItemContext } from './utils';

interface Handle {
  open: (event: React.MouseEvent, item: TestTreeItem) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: TestTreeItem;
}

interface Props {
  onRunTest: (testIds: Array<RunnableTestId>) => void;
  onBuildTestSuite: (suiteId: TestSuiteId) => void;
  onShowTestLocation: (testId: TestId) => void;
}

const TreeViewContextMenu: React.FC<Props & React.RefAttributes<Handle>> = forwardRef<Handle, Props>((props, ref) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    open: (event: React.MouseEvent, item: TestTreeItem): void => {
      setContextMenu({ x: event.clientX, y: event.clientY, item });
    }
  }));

  useEffect(() => {
    if (!contextMenu) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const menu = menuRef.current;
      if (menu && !menu.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('contextmenu', handleDocumentClick, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', () => setContextMenu(null));

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('contextmenu', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', () => setContextMenu(null));
    };
  }, [contextMenu]);

  if (!contextMenu) return null;

  const {
    isRunnable,
    isBuildable,
    isBuildEnabled,
    hasLocation,
    runnableIds,
    buildableIds,
    locationId,
  } = getItemContext(contextMenu.item);

  const handleRun = (): void => {
    setContextMenu(null);
    props.onRunTest(runnableIds);
  };

  const handleBuild = (): void => {
    setContextMenu(null);
    if (buildableIds) buildableIds.forEach(props.onBuildTestSuite);
  };

  const handleViewLocation = (): void => {
    setContextMenu(null);
    if (locationId) props.onShowTestLocation(locationId);
  };

  return (
    <ContextMenu
      ref={menuRef}
      x={contextMenu.x}
      y={contextMenu.y}
      isRunnable={isRunnable}
      isBuildable={isBuildable}
      isBuildEnabled={isBuildEnabled}
      hasLocation={hasLocation}
      onRun={handleRun}
      onBuild={handleBuild}
      onShowLocation={handleViewLocation}
    />
  );
});

export type { Handle as TreeViewContextMenuRef };
export default TreeViewContextMenu;