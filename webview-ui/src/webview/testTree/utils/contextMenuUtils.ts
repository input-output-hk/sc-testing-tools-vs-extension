import type { ContextMenuTarget } from '../components/TreeView/ContextMenu';
import {
  getGroupTests,
  getGroupTestIds,
  getPackageStatus,
  isRunnableStatus,
  isTestRunnable,
  isSelectionEntryRunnable,
} from './treeUtils';

/** Expands a context menu target into the ids that "Run Tests" should dispatch. */
export const getRunTargetIds = (target: ContextMenuTarget): Array<RunnableTestId> => {
  switch (target.type) {
    case 'package':
      return Object.values(target.testPackage.suites).map(
        (suite): TestSuiteId => [target.testPackage.workspace.id, target.testPackage.name, suite.name]
      );
    case 'suite':
      return [[target.workspaceId, target.packageName, target.suite.name]];
    case 'group':
      return getGroupTestIds(target.node);
    case 'test':
      return [target.node.test.id];
  }
};

/** Colon-joined `selected` key for a suite/test target, or null for package/group (never individually present in `selected`). */
const getTargetSelectionKey = (target: ContextMenuTarget): string | null => {
  switch (target.type) {
    case 'suite':
      return [target.workspaceId, target.packageName, target.suite.name].join(':');
    case 'test':
      return target.node.test.id.join(':');
    default:
      return null;
  }
};

/** Whether the target itself (ignoring any wider `selected` set) has anything runnable in it. */
const isTargetRunnable = (target: ContextMenuTarget): boolean => {
  switch (target.type) {
    case 'package':
      return isRunnableStatus(getPackageStatus(target.testPackage));
    case 'suite':
      return isRunnableStatus(target.suite.status);
    case 'group':
      return getGroupTests(target.node).some(isTestRunnable);
    case 'test':
      return isTestRunnable(target.node.test);
  }
};

/** Disables "Run Tests" only when nothing in the effective selection (or the lone target) can currently run. */
export const isContextMenuRunDisabled = (target: ContextMenuTarget, selected: Set<string>, testTree: TestTree): boolean => {
  const key = getTargetSelectionKey(target);
  if (key !== null && selected.has(key) && selected.size > 1) {
    return Array.from(selected).every(id => !isSelectionEntryRunnable(testTree, id));
  }
  return !isTargetRunnable(target);
};

/** Disables "Refresh Tests" when the target package/suite is already running or waiting. */
export const isContextMenuRefreshDisabled = (target: ContextMenuTarget): boolean =>
  target.type === 'package'
    ? !isRunnableStatus(getPackageStatus(target.testPackage))
    : target.type === 'suite' && !isRunnableStatus(target.suite.status);

/** Shows "View in source file" only for a single selected test that has a known location. */
export const isContextMenuViewLocationVisible = (target: ContextMenuTarget, selected: Set<string>): boolean => {
  if (target.type !== 'test') return false;
  const key = target.node.test.id.join(':');
  const effectiveSize = selected.has(key) ? selected.size : 1;
  return effectiveSize === 1 && target.node.test.location !== undefined;
};

/** Shows "Refresh Tests" only for suite and package targets. */
export const isContextMenuRefreshVisible = (target: ContextMenuTarget): boolean =>
  target.type === 'suite' || target.type === 'package';
