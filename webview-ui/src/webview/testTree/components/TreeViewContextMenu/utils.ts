import {
  getGroupTestRunnableIds,
  isTestRunnable,
  getPackageStatus,
} from '../../utils/treeUtils';

interface ItemContext {
  isRunnable: boolean;
  isBuildable: boolean;
  isBuildEnabled: boolean;
  hasLocation: boolean;
  runnableIds: Array<RunnableTestId>;
  buildableIds?: Array<TestSuiteId>;
  locationId?: TestId;
}

export const getItemContext = (item: TestTreeItem): ItemContext => {
  switch (item.type) {
    case 'package':
      return getPackageContext(item.packageNode);
    case 'suite':
      return getSuiteContext(item.suiteId, item.suiteNode);
    case 'node':
      return getNodeContext(item.node);
  }
};

const getPackageContext = (packageNode: TestPackage): ItemContext => {
  const status = getPackageStatus(packageNode);
  const isRunnable = !status.isRunning && !status.isWaiting;
  const suiteIds: Array<TestSuiteId> = Object.values(packageNode.suites)
    .map(suite => [packageNode.workspace.id, packageNode.name, suite.name]);
  return {
    isRunnable,
    isBuildable: true,
    isBuildEnabled: isRunnable,
    hasLocation: false,
    runnableIds: suiteIds,
    buildableIds: suiteIds,
  };
};

const getSuiteContext = (suiteId: TestSuiteId, suiteNode: TestSuite): ItemContext => {
  const isRunnable = !suiteNode.isRunning && !suiteNode.isWaiting;
  return {
    isRunnable,
    isBuildable: true,
    isBuildEnabled: isRunnable,
    hasLocation: false,
    runnableIds: [suiteId],
    buildableIds: [suiteId],
  };
};

const getNodeContext = (node: TestTreeNode): ItemContext => {
  if (node.type === 'group') {
    const runnableIds = getGroupTestRunnableIds(node as TestTreeGroupNode);
    return {
      isRunnable: runnableIds.length > 0,
      isBuildable: false,
      isBuildEnabled: false,
      hasLocation: false,
      runnableIds,
    };
  } else {
    const test = (node as TestTreeTestNode).test;
    return {
      isRunnable: isTestRunnable(test),
      isBuildable: false,
      isBuildEnabled: false,
      hasLocation: test.location !== undefined,
      runnableIds: [test.id],
      locationId: test.location !== undefined ? test.id : undefined,
    };
  }
};
