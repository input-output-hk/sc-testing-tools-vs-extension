import {
  getGroupStatus,
  getGroupTests,
  getGroupTime,
  nodeMatchesFilter,
  packageMatchesFilter,
  sortPackages,
  sortSuites,
  sortTreeNodes,
  suiteMatchesFilter,
} from '../../testTree/utils/treeUtils';

export const asGroup = (suite: TestSuite): TestTreeGroupNode => ({
  type: 'group',
  name: suite.name,
  nodes: suite.tests,
  isOpen: suite.isOpen,
});

const fillSuiteStatus = (suite: TestSuite): void => {
  const group = asGroup(suite);
  const status = getGroupStatus(group);
  suite.status = status.status;
  suite.isWaiting = status.isWaiting;
  suite.isBuilding = status.isBuilding;
  suite.isRunning = status.isRunning;
  suite.time = getGroupTime(group);
};

export const fillRunStatus = (runs: Array<TestRunTree>): void => {
  for (const run of runs) {
    for (const testPackage of Object.values(run.testTree.packages)) {
      for (const suite of Object.values(testPackage.suites)) {
        fillSuiteStatus(suite);
      }
    }
  }
};

export const isNeverRun = (test: Test): boolean =>
  test.status === 'undetermined' && !test.isRunning && !test.isWaiting && !test.isBuilding;

export const isGroupNeverRun = (group: TestTreeGroupNode): boolean =>
  getGroupTests(group).every(isNeverRun);

export const isSuiteNeverRun = (suite: TestSuite): boolean =>
  isGroupNeverRun(asGroup(suite));

export const isPackageNeverRun = (testPackage: TestPackage): boolean =>
  Object.values(testPackage.suites).every(isSuiteNeverRun);

export const getVisiblePackages = (testTree: TestTree, filter: TestTreeFilter, sortBy: SortBy): Array<TestPackage> => {
  const packages: Array<TestPackage> = [];
  for (const testPackage of Object.values(testTree.packages)) {
    if (packageMatchesFilter(testPackage, filter)) packages.push(testPackage);
  }
  return packages.sort(sortPackages(sortBy));
};

export const getVisibleSuites = (testPackage: TestPackage, filter: TestTreeFilter, sortBy: SortBy): Array<TestSuite> => {
  const suites: Array<TestSuite> = [];
  for (const suite of Object.values(testPackage.suites)) {
    if (suiteMatchesFilter(suite, filter)) suites.push(suite);
  }
  return suites.sort(sortSuites(sortBy));
};

export const getVisibleNodes = (nodes: TestTreeNodeMap, filter: TestTreeFilter, sortBy: SortBy): Array<TestTreeNode> => {
  const visible: Array<TestTreeNode> = [];
  for (const node of Object.values(nodes)) {
    if (nodeMatchesFilter(node, filter)) visible.push(node);
  }
  return visible.sort(sortTreeNodes(sortBy));
};

export const isFilterActive = (filter: TestTreeFilter): boolean =>
  !!filter.text?.trim() || filter.status !== undefined || filter.type !== undefined;

export const filterRuns = (runs: Array<TestRunTree>, filter: TestTreeFilter): Array<TestRunTree> => {
  const result: Array<TestRunTree> = [];
  for (const run of runs) {
    for (const testPackage of Object.values(run.testTree.packages)) {
      if (packageMatchesFilter(testPackage, filter)) {
        result.push(run);
        break;
      }
    }
  }
  return result;
};
