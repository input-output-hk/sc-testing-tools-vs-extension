import type { ContextMenuTarget } from '../components/TreeView/ContextMenu';
import {
  getGroupTests,
  getGroupTestIds,
  getPackageStatus,
  isRunnableStatus,
  isTestRunnable,
} from './treeUtils';

/** Expands a context menu target into the ids that "Run Tests" should dispatch. */
export const getRunTargetIds = (target: ContextMenuTarget): Array<RunnableTestId> => {
  switch (target.type) {
    case 'package':
      return Object.values(target.packageNode.suites).map(
        (suite): TestSuiteId => [target.packageNode.workspace.id, target.packageNode.name, suite.name]
      );
    case 'suite':
      return [[target.workspaceId, target.packageName, target.suiteNode.name]];
    case 'node':
      return target.node.type === 'test'
        ? [(target.node as TestTreeTestNode).test.id]
        : getGroupTestIds(target.node as TestTreeGroupNode);
  }
};

/** Whether the target itself has anything runnable in it. */
const isTargetRunnable = (target: ContextMenuTarget): boolean => {
  switch (target.type) {
    case 'package':
      return isRunnableStatus(getPackageStatus(target.packageNode));
    case 'suite':
      return isRunnableStatus(target.suiteNode.status);
    case 'node':
      return target.node.type === 'test'
        ? isTestRunnable((target.node as TestTreeTestNode).test)
        : getGroupTests(target.node as TestTreeGroupNode).some(isTestRunnable);
  }
};

/** Disables "Run Tests" when the target has nothing currently runnable — same rule as the row's own Run button. */
export const isContextMenuRunDisabled = (target: ContextMenuTarget): boolean =>
  !isTargetRunnable(target);

/** Disables "Refresh Tests" when the target package/suite is already running or waiting. */
export const isContextMenuRefreshDisabled = (target: ContextMenuTarget): boolean =>
  target.type === 'package'
    ? !isRunnableStatus(getPackageStatus(target.packageNode))
    : target.type === 'suite' && !isRunnableStatus(target.suiteNode.status);

/** Shows "View in source file" only for a single selected test that has a known location. */
export const isContextMenuViewLocationVisible = (target: ContextMenuTarget, selected: Set<string>): boolean => {
  if (target.type !== 'node' || target.node.type !== 'test') return false;
  const test = (target.node as TestTreeTestNode).test;
  const key = test.id.join(':');
  const effectiveSize = selected.has(key) ? selected.size : 1;
  return effectiveSize === 1 && test.location !== undefined;
};

/** Shows "Refresh Tests" only for suite and package targets. */
export const isContextMenuRefreshVisible = (target: ContextMenuTarget): boolean =>
  target.type === 'suite' || target.type === 'package';
