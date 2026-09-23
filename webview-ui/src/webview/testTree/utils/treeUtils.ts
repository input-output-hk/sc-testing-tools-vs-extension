
export const nodeMatchesFilter = (node: TestTreeNode, filter: TestTreeFilter): boolean => {
  const textFilter = filter.text?.toLowerCase();
  if (node.type === 'test') {
    const test = (node as TestTreeTestNode).test;
    return test !== undefined &&
      (textFilter === undefined || test.name.toLowerCase().includes(textFilter)) &&
      (filter.status === undefined || test.status === filter.status) &&
      (filter.type === undefined || test.type === filter.type);
  }
  const group = node as TestTreeGroupNode;
  const text = textFilter === undefined || group.name.toLowerCase().includes(textFilter)
    ? undefined : filter.text;
  return Object.values(group.nodes).some((child) => nodeMatchesFilter(child, { ...filter, text }));
};

export const suiteMatchesFilter = (suite: TestSuite, filter: TestTreeFilter): boolean => {
  const text = filter.text === undefined || suite.name.toLowerCase().includes(filter.text.toLowerCase())
    ? undefined : filter.text;
  return Object.values(suite.tests).some((node) => nodeMatchesFilter(node, { ...filter, text }));
};

export const packageMatchesFilter = (testPackage: TestPackage, filter: TestTreeFilter): boolean => {
  const text = filter.text === undefined || testPackage.name.toLowerCase().includes(filter.text.toLowerCase())
    ? undefined : filter.text;
  return Object.values(testPackage.suites).some((suite) => suiteMatchesFilter(suite, { ...filter, text }));
};

export const getPackageStatus = (testPackage: TestPackage): RunStatusContext => {
  const suites = Object.values(testPackage.suites);
  const context: RunStatusContext = {
    status: 'undetermined',
    isWaiting: false,
    isRunning: false
  };

  if (suites.some(suite => suite.isRunning)) {
    context.isRunning = true;
  } else if (suites.some(suite => suite.isWaiting)) {
    context.isWaiting = true;
  } else if (suites.some(suite => suite.status === 'invalid')) {
    context.status = 'invalid';
  } else if (suites.every(suite => suite.status === 'valid')) {
    context.status = 'valid';
  }

  return context;
};

export const getPackageTime = (testPackage: TestPackage): number => {
  return Object.values(testPackage.suites)
    .map(suite => suite.time ?? 0)
    .reduce((sum, time) => sum + time, 0);
};

export const getGroupTests = (group: TestTreeGroupNode): Array<Test> => {
  const tests: Array<Test> = [];
  for (const node of Object.values(group.nodes)) {
    if (node.type === 'test') {
      tests.push((node as TestTreeTestNode).test);
    } else if (node.type === 'group') {
      tests.push(...getGroupTests(node as TestTreeGroupNode));
    }
  }
  return tests;
};

const nodeHasResult = (node: TestTreeNode): boolean => {
  if (node.type === 'test') return (node as TestTreeTestNode).test.status !== 'undetermined';
  return Object.values((node as TestTreeGroupNode).nodes).some(nodeHasResult);
};

export const testTreeHasResults = (testTree: TestTree): boolean =>
  Object.values(testTree.packages).some(testPackage =>
    Object.values(testPackage.suites).some(suite =>
      Object.values(suite.tests).some(nodeHasResult)));

export const getGroupTestRunnableIds =(group: TestTreeGroupNode): Array<TestId> => {
  return getGroupTests(group).filter(isTestRunnable).map((test) => test.id);
};

export const getGroupStatus = (group: TestTreeGroupNode): RunStatusContext => {
  const tests = getGroupTests(group);
  const context: RunStatusContext = {
    status: 'undetermined',
    isWaiting: false,
    isRunning: false
  };

  if (tests.some(test => test.isRunning)) {
    context.isRunning = true;
  } else if (tests.some(test => test.isWaiting)) {
    context.isWaiting = true;
  } else if (tests.some(test => test.status === 'invalid')) {
    context.status = 'invalid';
  } else if (tests.every(test => test.status === 'valid')) {
    context.status = 'valid';
  }

  return context;
};

export const getGroupTime = (group: TestTreeGroupNode): number => {
  return getGroupTests(group)
    .map(test => test.time ?? 0)
    .reduce((sum, time) => sum + time, 0);
};

export const isTestRunnable = (test: Test): boolean =>
  !test.isStatic && !test.isRunning && !test.isWaiting;

const compareTestsById = (a: Test, b: Test): number => {
  const [,,, testIdA] = a.id;
  const [,,, testIdB] = b.id;
  return parseInt(testIdA) - parseInt(testIdB);
};

const getStatusRank = (context: RunStatusContext): number => {
  if (context.isRunning) return 4;
  if (context.status === 'valid') return 0;
  if (context.status === 'invalid') return 1;
  if (context.isWaiting) return 2;
  return 3;
};

const compareTestsByStatus = (a: Test, b: Test): number =>
  getStatusRank(a) - getStatusRank(b) || compareTestsById(a, b);

const compareGroups = (sortBy: SortBy, a: TestTreeGroupNode, b: TestTreeGroupNode): number => {
  const statusOrder = sortBy === 'status' ? getStatusRank(getGroupStatus(a)) - getStatusRank(getGroupStatus(b)) : 0;
  return statusOrder || a.name.localeCompare(b.name);
};

export const sortPackages = (sortBy: SortBy) => (a: TestPackage, b: TestPackage): number => {
  if (sortBy !== 'status') return 0;
  return getStatusRank(getPackageStatus(a)) - getStatusRank(getPackageStatus(b));
};

export const sortSuites = (sortBy: SortBy) => (a: TestSuite, b: TestSuite): number => {
  if (sortBy !== 'status') return 0;
  return getStatusRank(a) - getStatusRank(b);
};

const getTestComparator = (sortBy: SortBy): (a: Test, b: Test) => number => {
  if (sortBy === 'status') return compareTestsByStatus;
  return compareTestsById;
};

export const sortTreeNodes = (sortBy: SortBy) => (a: TestTreeNode, b: TestTreeNode): number => {
  if (a.type === 'group' && b.type === 'test') {
    return -1;
  } else if (a.type === 'test' && b.type === 'group') {
    return +1;
  } else if (a.type === 'group' && b.type === 'group') {
    return compareGroups(sortBy, a as TestTreeGroupNode, b as TestTreeGroupNode);
  } else {
    const testA = (a as TestTreeTestNode).test;
    const testB = (b as TestTreeTestNode).test;
    return getTestComparator(sortBy)(testA, testB);
  }
};
