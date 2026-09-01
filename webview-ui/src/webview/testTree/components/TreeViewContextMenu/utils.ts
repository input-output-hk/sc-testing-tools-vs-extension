import {
  getGroupTests,
  isTestRunnable,
  getPackageStatus,
  isRunnableStatus,
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
  const isRunnable = isRunnableStatus(getPackageStatus(packageNode));
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
  const isRunnable = isRunnableStatus(suiteNode.status);
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
    const nodes = getGroupTests(node as TestTreeGroupNode);
    return {
      isRunnable: nodes.some(isTestRunnable),
      isBuildable: false,
      isBuildEnabled: false,
      hasLocation: false,
      runnableIds: nodes.map(node => node.id),
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
