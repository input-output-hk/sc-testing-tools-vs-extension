/** Returns true if the node or any of its descendants match the filter string. */
export const nodeMatchesFilter = (node: TestTreeNode, filter: string, tests: TestList): boolean => {
  const lowerFilter = filter.toLowerCase();
  if (node.type === 'test') {
    return tests[(node as TestTreeTestNode).testId].name.toLowerCase().includes(lowerFilter);
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
    const status = tests[(node as TestTreeTestNode).testId].status;
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

/**
 * Returns true if the suite name or any of its descendants match the filter string.
 * A suite that hasn't been built yet has no tree to search, so it matches on name alone.
 */
export const suiteMatchesFilter = (suite: TestSuite, filter: string, tests: TestList): boolean => {
  const lowerFilter = filter.toLowerCase();
  if (suite.name.toLowerCase().includes(lowerFilter)) {
    return true;
  }
  if (suite.status !== 'ready') {
    return false;
  }
  return Object.values(suite.tree).some((node) => nodeMatchesFilter(node, filter, tests));
};

/**
 * Returns true if the suite matches the status filter. A suite that hasn't been
 * built yet has no test statuses, so the status filter never hides it.
 */
export const suiteMatchesStatus = (suite: TestSuite, statusFilter: TestStatus | null, tests: TestList): boolean => {
  if (statusFilter === null || suite.status !== 'ready') {
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
