import { useState, forwardRef, useImperativeHandle } from 'react';

import ContextMenu, { type ContextMenuItem } from '../../../../components/ContextMenu';
import { getItemContext } from './utils';

interface Handle {
  open: (event: React.MouseEvent, item: TestTreeItem) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: TestTreeItem;
}

type TreeViewContextMenuAction = 'run' | 'build' | 'results' | 'coverage' | 'location';

interface Props {
  onRunTest: (testIds: Array<RunnableTestId>) => void;
  onBuildTestSuite: (suiteId: TestSuiteId) => void;
  onShowTestLocation: (testId: TestId) => void;
  onOpenTestResult: (testId: TestId) => void;
  onShowCoverage: (test: Test) => void;
}

const TreeViewContextMenu: React.FC<Props & React.RefAttributes<Handle>> = forwardRef<Handle, Props>((props, ref) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useImperativeHandle(ref, () => ({
    open: (event: React.MouseEvent, item: TestTreeItem): void => {
      setContextMenu({ x: event.clientX, y: event.clientY, item });
    }
  }));

  if (!contextMenu) return null;

  const {
    isRunnable,
    isBuildable,
    isBuildEnabled,
    hasLocation,
    hasResults,
    hasCoverage,
    runnableIds,
    buildableIds,
    locationId,
    test,
  } = getItemContext(contextMenu.item);

  const items: Array<ContextMenuItem<TreeViewContextMenuAction>> = [
    {
      value: 'run',
      disabled: !isRunnable,
      content: <><i className="codicon codicon-run-all" /><span>Run Tests</span></>,
    },
  ];
  if (isBuildable) {
    items.push({
      value: 'build',
      disabled: !isBuildEnabled,
      content: <><i className="codicon codicon-refresh" /><span>Refresh Test Tree</span></>,
    });
  }
  if (hasResults) {
    items.push({
      value: 'results',
      content: <><i className="codicon codicon-tasklist" /><span>View Results</span></>,
    });
  }
  if (hasCoverage) {
    items.push({
      value: 'coverage',
      content: <><i className="codicon codicon-coverage" /><span>View Test Coverage</span></>,
    });
  }
  if (hasLocation) {
    items.push({
      value: 'location',
      content: <><i className="codicon codicon-go-to-file" /><span>View in source file</span></>,
    });
  }

  const handleSelect = (action: TreeViewContextMenuAction): void => {
    switch (action) {
      case 'run':
        props.onRunTest(runnableIds);
        break;
      case 'build':
        if (buildableIds) buildableIds.forEach(props.onBuildTestSuite);
        break;
      case 'results':
        if (test) props.onOpenTestResult(test.id);
        break;
      case 'coverage':
        if (test) props.onShowCoverage(test);
        break;
      case 'location':
        if (locationId) props.onShowTestLocation(locationId);
        break;
    }
  };

  const handleClose = (): void => {
    setContextMenu(null);
  };

  return (
    <ContextMenu
      position={contextMenu}
      items={items}
      onSelect={handleSelect}
      onClose={handleClose}
    />
  );
});

export type { Handle as TreeViewContextMenuRef };
export default TreeViewContextMenu;
