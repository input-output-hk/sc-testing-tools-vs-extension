import { useEffect, useRef } from 'react';

import ContextMenu, { type ContextMenuTarget } from './ContextMenu';
import {
  getRunTargetIds,
  isContextMenuRunDisabled,
  isContextMenuRefreshDisabled,
  isContextMenuViewLocationVisible,
  isContextMenuRefreshVisible,
} from '../../utils/contextMenuUtils';

export interface ContextMenuState {
  x: number;
  y: number;
  target: ContextMenuTarget;
}

interface TreeViewContextMenuProps {
  contextMenu: ContextMenuState | null;
  testTree: TestTree;
  selected: Set<string>;
  onClose: () => void;
  onRunTest: (testIds: Array<RunnableTestId>) => void;
  onBuildTestSuite: (suiteId: TestSuiteId) => void;
  onShowTestLocation: (testId: TestId) => void;
}

const TreeViewContextMenu: React.FC<TreeViewContextMenuProps> = ({
  contextMenu,
  testTree,
  selected,
  onClose,
  onRunTest,
  onBuildTestSuite,
  onShowTestLocation,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const menu = menuRef.current;
      if (menu && !menu.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('contextmenu', handleDocumentClick, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('contextmenu', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', onClose);
    };
  }, [contextMenu, onClose]);

  const handleRun = (): void => {
    if (!contextMenu) return;
    onRunTest(getRunTargetIds(contextMenu.target));
    onClose();
  };

  const handleRefresh = (): void => {
    if (!contextMenu) return;
    const { target } = contextMenu;
    if (target.type === 'suite') {
      onBuildTestSuite([target.workspaceId, target.packageName, target.suiteNode.name]);
    } else if (target.type === 'package') {
      Object.values(target.packageNode.suites).forEach(suite =>
        onBuildTestSuite([target.packageNode.workspace.id, target.packageNode.name, suite.name])
      );
    }
    onClose();
  };

  const handleViewLocation = (): void => {
    if (!contextMenu || contextMenu.target.type !== 'node' || contextMenu.target.node.type !== 'test') return;
    onShowTestLocation((contextMenu.target.node as TestTreeTestNode).test.id);
    onClose();
  };

  if (!contextMenu) {
    return null;
  }

  return (
    <ContextMenu
      ref={menuRef}
      x={contextMenu.x}
      y={contextMenu.y}
      runDisabled={isContextMenuRunDisabled(contextMenu.target, selected, testTree)}
      onRun={handleRun}
      showRefresh={isContextMenuRefreshVisible(contextMenu.target)}
      refreshDisabled={isContextMenuRefreshDisabled(contextMenu.target)}
      onRefresh={handleRefresh}
      showViewLocation={isContextMenuViewLocationVisible(contextMenu.target, selected)}
      onViewLocation={handleViewLocation}
    />
  );
};

export default TreeViewContextMenu;
