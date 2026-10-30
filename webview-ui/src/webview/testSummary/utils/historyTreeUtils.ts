import {
  getGroupStatus,
  getGroupTests,
  getGroupTime,
  getVisibleItems,
  parseFilterText,
  sortPackages,
  sortSuites,
  sortTreeNodes,
} from '../../testTree/utils/treeUtils';

export type VisibleRun = {
  run: TestRunTree;
  visible: Set<VisibleItem>;
};

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

export const getVisiblePackages = (testTree: TestTree, visible: Set<VisibleItem>, sortBy: SortBy): Array<TestPackage> => {
  const packages: Array<TestPackage> = [];
  for (const testPackage of Object.values(testTree.packages)) {
    if (visible.has(testPackage)) packages.push(testPackage);
  }
  return packages.sort(sortPackages(sortBy));
};

export const getVisibleSuites = (testPackage: TestPackage, visible: Set<VisibleItem>, sortBy: SortBy): Array<TestSuite> => {
  const suites: Array<TestSuite> = [];
  for (const suite of Object.values(testPackage.suites)) {
    if (visible.has(suite)) suites.push(suite);
  }
  return suites.sort(sortSuites(sortBy));
};

export const getVisibleNodes = (nodes: TestTreeNodeMap, visible: Set<VisibleItem>, sortBy: SortBy): Array<TestTreeNode> => {
  const visibleNodes: Array<TestTreeNode> = [];
  for (const node of Object.values(nodes)) {
    if (visible.has(node)) visibleNodes.push(node);
  }
  return visibleNodes.sort(sortTreeNodes(sortBy));
};

export const isFilterActive = (filter: TestTreeFilter): boolean => {
  const { positiveKeywords, negativeKeywords, tagKeywords } = parseFilterText(filter.text);
  return positiveKeywords.length > 0 || negativeKeywords.length > 0 || tagKeywords.length > 0 ||
    filter.status !== undefined || filter.type !== undefined;
};

export const filterRuns = (runs: Array<TestRunTree>, filter: TestTreeFilter): Array<VisibleRun> => {
  const result: Array<VisibleRun> = [];
  for (const run of runs) {
    const visible = getVisibleItems(run.testTree, filter);
    if (visible.size > 0) result.push({ run, visible });
  }
  return result;
};
