/** Returns true if the node or any of its descendants match the filter string. */
export const nodeMatchesFilter = (node: TestTreeNode, filter: string): boolean => {
  const lowerFilter = filter.toLowerCase();
  if (node.type === 'test') {
    const test = (node as TestTreeTestNode).test;
    return test !== undefined && test.name.toLowerCase().includes(lowerFilter);
  }
  const group = node as TestTreeGroupNode;
  return (
    group.name.toLowerCase().includes(lowerFilter) ||
    Object.values(group.nodes).some((child) => nodeMatchesFilter(child, filter))
  );
};

/** Returns true if the node or any of its descendants match the status filter. */
export const nodeMatchesStatus = (node: TestTreeNode, statusFilter: RunStatus | null): boolean => {
  if (node.type === 'test') {
    const test = (node as TestTreeTestNode).test;
    if (test === undefined) return false;
    const status = test.status;
    return statusFilter === null || status === statusFilter;
  }
  const group = node as TestTreeGroupNode;
  return Object.values(group.nodes).some((child) => nodeMatchesStatus(child, statusFilter));
};

/** Returns true if the node or any of its descendants match the type filter. */
export const nodeMatchesType = (node: TestTreeNode, typeFilter: TestType | null): boolean => {
  if (node.type === 'test') {
    const test = (node as TestTreeTestNode).test;
    if (test === undefined) return false;
    return typeFilter === null || test.type === typeFilter;
  }
  const group = node as TestTreeGroupNode;
  return Object.values(group.nodes).some((child) => nodeMatchesType(child, typeFilter));
};

/** Returns true if the suite name or any of its descendants match the filter string. */
export const suiteMatchesFilter = (suite: TestSuite, filter: string): boolean => {
  const lowerFilter = filter.toLowerCase();
  if (suite.name.toLowerCase().includes(lowerFilter)) {
    return true;
  }
  return Object.values(suite.tests).some((node) => nodeMatchesFilter(node, filter));
};

/** Returns true if the suite matches the status filter. */
export const suiteMatchesStatus = (suite: TestSuite, statusFilter: RunStatus | null): boolean => {
  if (statusFilter === null) {
    return true;
  }
  return Object.values(suite.tests).some((node) => nodeMatchesStatus(node, statusFilter));
};

/** Returns true if the suite matches the type filter. */
export const suiteMatchesType = (suite: TestSuite, typeFilter: TestType | null): boolean => {
  if (typeFilter === null) {
    return true;
  }
  return Object.values(suite.tests).some((node) => nodeMatchesType(node, typeFilter));
};

/** Returns true if the package name or any of its suites match the filter string. */
export const packageMatchesFilter = (testPackage: TestPackage, filter: string): boolean => {
  if (testPackage.name.toLowerCase().includes(filter.toLowerCase())) {
    return true;
  }
  return Object.values(testPackage.suites).some((suite) => suiteMatchesFilter(suite, filter));
};

/** Returns true if any of the package's suites match the status filter. */
export const packageMatchesStatus = (testPackage: TestPackage, statusFilter: RunStatus | null): boolean => {
  return Object.values(testPackage.suites).some((suite) => suiteMatchesStatus(suite, statusFilter));
};

/** Returns true if any of the package's suites match the type filter. */
export const packageMatchesType = (testPackage: TestPackage, typeFilter: TestType | null): boolean => {
  return Object.values(testPackage.suites).some((suite) => suiteMatchesType(suite, typeFilter));
};

export const getPackageStatus = (testPackage: TestPackage): RunStatus => {
  const statuses = Object.values(testPackage.suites).map((suite) => suite.status);

  if (statuses.includes('running')) {
    return 'running';
  } else if (statuses.includes('invalid')) {
    return 'invalid';
  } else if (statuses.every((status) => status === 'valid')) {
    return 'valid';
  }

  return 'undetermined';
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

export const getGroupTestIds = (group: TestTreeGroupNode): Array<TestId> => {
  return getGroupTests(group).map((test) => test.id);
};

export const getGroupStatus = (group: TestTreeGroupNode): RunStatus => {
  const statuses = getGroupTests(group).map(test => test.status);

  if (statuses.includes('running')) {
    return 'running';
  } else if (statuses.includes('invalid')) {
    return 'invalid';
  } else if (statuses.every((status) => status === 'waiting')) {
    return 'waiting';
  } else if (statuses.every((status) => status === 'valid')) {
    return 'valid';
  }

  return 'undetermined';
};

export const getGroupTime = (group: TestTreeGroupNode): number => {
  return getGroupTests(group)
    .map(test => test.time ?? 0)
    .reduce((sum, time) => sum + time, 0);
};

export const isRunnableTestId = (testId: RunnableTestId): boolean => {
  return testId[3] === undefined || !testId[3].startsWith('static');
};

export const isRunnableStatus = (status: RunStatus): boolean =>
  status !== 'running' && status !== 'waiting';

export const isTestRunnable = (test: Test): boolean =>
  isRunnableTestId(test.id) && isRunnableStatus(test.status);

export const sortTreeNodes = (a: TestTreeNode, b: TestTreeNode): number => {
  if (a.type === 'group' && b.type === 'test') {
    return +1;
  } else if (a.type === 'test' && b.type === 'group') {
    return -1;
  } else if (a.type === 'group' && b.type === 'group') {
    const groupA = a as TestTreeGroupNode;
    const groupB = b as TestTreeGroupNode;
    return groupA.name.localeCompare(groupB.name);
  } else {
    const [,,, testIdA] = (a as TestTreeTestNode).test.id;
    const [,,, testIdB] = (b as TestTreeTestNode).test.id;
    return parseInt(testIdA.replace('static', '')) - parseInt(testIdB.replace('static', ''));
  }
};

export const formatTestTime = (time: number): string => {
  if (time < 1000) {
    return `${time.toFixed(2)}ms`;
  } else {
    return `${(time / 1000).toFixed(2)}s`;
  }
};