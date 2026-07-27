/** Returns true if the node or any of its descendants match the filter string. */
export const nodeMatchesFilter = (node: TestTreeNode, filter: string, tests: TestList): boolean => {
  const lowerFilter = filter.toLowerCase();
  if (node.type === 'test') {
    const test = tests[(node as TestTreeTestNode).testId];
    return test !== undefined && test.name.toLowerCase().includes(lowerFilter);
  }
  const group = node as TestTreeGroupNode;
  return (
    group.name.toLowerCase().includes(lowerFilter) ||
    Object.values(group.nodes).some((child) => nodeMatchesFilter(child, filter, tests))
  );
};

/** Returns true if the node or any of its descendants match the status filter. */
export const nodeMatchesStatus = (node: TestTreeNode, statusFilter: TestStatus | null, tests: TestList): boolean => {
  if (node.type === 'test') {
    const test = tests[(node as TestTreeTestNode).testId];
    if (test === undefined) return false;
    const status = test.status;
    return statusFilter === null || status === statusFilter;
  }
  const group = node as TestTreeGroupNode;
  return Object.values(group.nodes).some((child) => nodeMatchesStatus(child, statusFilter, tests));
};

/** Collects all test IDs nested within a group, recursively. */
export const getGroupTestIds = (group: TestTreeGroupNode): Array<string> => {
  const testIds: Array<string> = [];
  for (const node of Object.values(group.nodes)) {
    if (node.type === 'test') {
      testIds.push((node as TestTreeTestNode).testId);
    } else if (node.type === 'group') {
      testIds.push(...getGroupTestIds(node as TestTreeGroupNode));
    }
  }
  return testIds;
};

/** Collects only runnable test IDs nested within a group, recursively. */
export const getGroupRunnableTestIds = (group: TestTreeGroupNode, tests: TestList): Array<string> => {
  const runnableIds: Array<string> = [];
  for (const node of Object.values(group.nodes)) {
    if (node.type === 'test') {
      const testId = (node as TestTreeTestNode).testId;
      const test = tests[testId];
      if (test?.isRunnable) {
        runnableIds.push(testId);
      }
    } else if (node.type === 'group') {
      runnableIds.push(...getGroupRunnableTestIds(node as TestTreeGroupNode, tests));
    }
  }
  return runnableIds;
};

/**
 * Returns true if the suite name or any of its descendants match the filter string.
 */
export const suiteMatchesFilter = (suite: TestSuite, filter: string, tests: TestList): boolean => {
  const lowerFilter = filter.toLowerCase();
  if (suite.name.toLowerCase().includes(lowerFilter)) {
    return true;
  }
  return Object.values(suite.tree).some((node) => nodeMatchesFilter(node, filter, tests));
};

/**
 * Returns true if the suite matches the status filter.
 */
export const suiteMatchesStatus = (suite: TestSuite, statusFilter: TestStatus | null, tests: TestList): boolean => {
  if (statusFilter === null) {
    return true;
  }
  return Object.values(suite.tree).some((node) => nodeMatchesStatus(node, statusFilter, tests));
};

/** Returns true if the package name or any of its suites match the filter string. */
export const packageMatchesFilter = (pkg: TestPackage, filter: string, tests: TestList): boolean => {
  if (pkg.name.toLowerCase().includes(filter.toLowerCase())) {
    return true;
  }
  return Object.values(pkg.suites).some((suite) => suiteMatchesFilter(suite, filter, tests));
};

/** Returns true if any of the package's suites match the status filter. */
export const packageMatchesStatus = (pkg: TestPackage, statusFilter: TestStatus | null, tests: TestList): boolean =>
  Object.values(pkg.suites).some((suite) => suiteMatchesStatus(suite, statusFilter, tests));

export const getPackageStatus = (packageName: string, tests: TestList): TestStatus => {
  const statuses = Object.keys(tests)
    .filter((testId) => testId.startsWith(`${packageName}:`))
    .map((testId) => tests[testId]?.status || 'undetermined');

  if (statuses.includes('running')) {
    return 'running';
  } else if (statuses.includes('invalid')) {
    return 'invalid';
  } else if (statuses.every((status) => status === 'valid')) {
    return 'valid';
  }

  return 'undetermined';
};

export const getSuiteStatus = (packageName: string, suiteName: string, tests: TestList): TestStatus => {
  const statuses = Object.keys(tests)
    .filter((testId) => testId.startsWith(`${packageName}:${suiteName}:`))
    .map((testId) => tests[testId]?.status || 'undetermined');

  if (statuses.includes('running')) {
    return 'running';
  } else if (statuses.includes('invalid')) {
    return 'invalid';
  } else if (statuses.every((status) => status === 'valid')) {
    return 'valid';
  }

  return 'undetermined';
};

export const getGroupStatus = (group: TestTreeGroupNode, tests: TestList): TestStatus => {
  const statuses = getGroupTestIds(group).map((testId) => tests[testId]?.status || 'undetermined');

  if (statuses.includes('running')) {
    return 'running';
  } else if (statuses.includes('invalid')) {
    return 'invalid';
  } else if (statuses.every((status) => status === 'valid')) {
    return 'valid';
  }

  return 'undetermined';
};