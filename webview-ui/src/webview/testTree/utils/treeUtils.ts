
type FilterKeywords = {
  positiveKeywords: Array<string>;
  negativeKeywords: Array<string>;
  tagKeywords: Array<string>;
};

/**
 * Splits the filter box text into lowercase keywords. Only the first character of a word picks its list:
 * `!word` → negative, `@word` → tag, anything else → positive. A lone `!` or `@` is ignored.
 * @example parseFilterText('Mint !slow @executed') // { positiveKeywords: ['mint'], negativeKeywords: ['slow'], tagKeywords: ['executed'] }
 */
export const parseFilterText = (text?: string): FilterKeywords => {
  const keywords: FilterKeywords = { positiveKeywords: [], negativeKeywords: [], tagKeywords: [] };
  for (const word of (text ?? '').toLowerCase().split(/\s+/)) {
    if (word.startsWith('!')) {
      if (word.length > 1) keywords.negativeKeywords.push(word.slice(1));
    } else if (word.startsWith('@')) {
      if (word.length > 1) keywords.tagKeywords.push(word.slice(1));
    } else if (word !== '') {
      keywords.positiveKeywords.push(word);
    }
  }
  return keywords;
};

/** Returns the display name of a package, suite, group or test. */
const getItemName = (item: VisibleItem): string => {
  if ('test' in item) return (item as TestTreeTestNode).test.name;
  return (item as TestPackage | TestSuite | TestTreeGroupNode).name;
};

/** Returns the direct children of an item: suites of a package, nodes of a suite or group. A test has none. */
const getItemChildren = (item: VisibleItem): Array<VisibleItem> => {
  if ('suites' in item) return Object.values((item as TestPackage).suites);
  if ('tests' in item) return Object.values((item as TestSuite).tests);
  if ('nodes' in item) return Object.values((item as TestTreeGroupNode).nodes);
  return [];
};

/** Returns the keywords that the name doesn't contain (case-insensitive). Keywords must already be lowercase. */
const getUnmatchedKeywords = (name: string, keywords: Array<string>): Array<string> => {
  const lowerName = name.toLowerCase();
  const unmatched: Array<string> = [];
  for (const keyword of keywords) {
    if (!lowerName.includes(keyword)) unmatched.push(keyword);
  }
  return unmatched;
};

/** Adds the item and its whole subtree to the visible set. */
const addItems = (item: VisibleItem, visible: Set<VisibleItem>): void => {
  visible.add(item);
  for (const child of getItemChildren(item)) addItems(child, visible);
};

/** Removes the item and its whole subtree from the visible set. */
const removeItems = (item: VisibleItem, visible: Set<VisibleItem>): void => {
  visible.delete(item);
  for (const child of getItemChildren(item)) removeItems(child, visible);
};

/** Step 1: removes every item whose name contains any negative keyword, with its whole subtree. */
const removeNegative = (item: VisibleItem, negativeKeywords: Array<string>, visible: Set<VisibleItem>): void => {
  if (getUnmatchedKeywords(getItemName(item), negativeKeywords).length < negativeKeywords.length) {
    removeItems(item, visible);
    return;
  }
  for (const child of getItemChildren(item)) removeNegative(child, negativeKeywords, visible);
};

/** Step 2: removes every test whose path (ancestor names and its own name) misses any positive keyword. */
const keepPositive = (item: VisibleItem, positiveKeywords: Array<string>, visible: Set<VisibleItem>): void => {
  const unmatched = getUnmatchedKeywords(getItemName(item), positiveKeywords);
  if ('test' in item) {
    if (unmatched.length > 0) visible.delete(item);
    return;
  }
  for (const child of getItemChildren(item)) keepPositive(child, unmatched, visible);
};

/** Step 3: mock until #228 defines the tags; keeps every test. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const keepTags = (_item: VisibleItem, _tagKeywords: Array<string>, _visible: Set<VisibleItem>): void => {};

/** Removes every test that doesn't match the status and type picked in the filter menu. */
const keepMenuFilter = (item: VisibleItem, filter: TestTreeFilter, visible: Set<VisibleItem>): void => {
  if ('test' in item) {
    const test = (item as TestTreeTestNode).test;
    if (
      test === undefined ||
      (filter.status !== undefined && test.status !== filter.status) ||
      (filter.type !== undefined && test.type !== filter.type)
    ) visible.delete(item);
    return;
  }
  for (const child of getItemChildren(item)) keepMenuFilter(child, filter, visible);
};

/** Removes every package, suite or group with no visible test left. Returns whether the item stays. */
const pruneEmpty = (item: VisibleItem, visible: Set<VisibleItem>): boolean => {
  if (!visible.has(item)) return false;
  if ('test' in item) return true;
  let hasVisibleChild = false;
  for (const child of getItemChildren(item)) {
    if (pruneEmpty(child, visible)) hasVisibleChild = true;
  }
  if (!hasVisibleChild) visible.delete(item);
  return hasVisibleChild;
};

/**
 * Runs the filter over the whole tree and returns the visible packages, suites, groups and tests.
 * Starts with everything visible; each step only removes items: negative, positive, tags, menu filter, then prune.
 */
export const getVisibleItems = (testTree: TestTree, filter: TestTreeFilter): Set<VisibleItem> => {
  const { positiveKeywords, negativeKeywords, tagKeywords } = parseFilterText(filter.text);
  const packages = Object.values(testTree.packages);
  const visible = new Set<VisibleItem>();
  for (const testPackage of packages) addItems(testPackage, visible);
  for (const testPackage of packages) removeNegative(testPackage, negativeKeywords, visible);
  for (const testPackage of packages) keepPositive(testPackage, positiveKeywords, visible);
  for (const testPackage of packages) keepTags(testPackage, tagKeywords, visible);
  for (const testPackage of packages) keepMenuFilter(testPackage, filter, visible);
  for (const testPackage of packages) pruneEmpty(testPackage, visible);
  return visible;
};

export const getPackageStatus = (testPackage: TestPackage): RunStatusContext => {
  const suites = Object.values(testPackage.suites);
  const context: RunStatusContext = {
    status: 'undetermined',
    isWaiting: false,
    isBuilding: false,
    isRunning: false
  };

  if (suites.some(suite => suite.isRunning)) {
    context.isRunning = true;
  } else if (suites.some(suite => suite.isBuilding)) {
    context.isBuilding = true;
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

export const getGroupTestRunnableIds =(group: TestTreeGroupNode): Array<TestId> => {
  return getGroupTests(group).filter(isTestRunnable).map((test) => test.id);
};

export const getGroupStatus = (group: TestTreeGroupNode): RunStatusContext => {
  const tests = getGroupTests(group);
  const context: RunStatusContext = {
    status: 'undetermined',
    isWaiting: false,
    isBuilding: false,
    isRunning: false
  };

  if (tests.some(test => test.isRunning)) {
    context.isRunning = true;
  } else if (tests.some(test => test.isBuilding)) {
    context.isBuilding = true;
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

export const isThreatModelsGroup = (name: string): boolean =>
  name.toLowerCase() === 'threat models';

export const hasTestResults = (test: Test): boolean =>
  test.type !== undefined && test.type !== 'unit-test';

export const isTestRunnable = (test: Test): boolean =>
  !test.isStatic && !test.isRunning && !test.isBuilding && !test.isWaiting;

const compareTestsById = (a: Test, b: Test): number => {
  const [,,, testIdA] = a.id;
  const [,,, testIdB] = b.id;
  return parseInt(testIdA) - parseInt(testIdB);
};

const getStatusRank = (context: RunStatusContext): number => {
  if (context.isRunning) return 0;
  if (context.status === 'valid') return 1;
  if (context.status === 'invalid') return 2;
  if (context.isWaiting) return 3;
  return 4;
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
    return +1;
  } else if (a.type === 'test' && b.type === 'group') {
    return -1;
  } else if (a.type === 'group' && b.type === 'group') {
    return compareGroups(sortBy, a as TestTreeGroupNode, b as TestTreeGroupNode);
  } else {
    const testA = (a as TestTreeTestNode).test;
    const testB = (b as TestTreeTestNode).test;
    return getTestComparator(sortBy)(testA, testB);
  }
};

export const mapJobStatusToClassName = (status: TestJobStatus): string => {
  switch (status) {
    case 'waiting':
      return 'codicon-history text-yellow-02';
    case 'running':
      return 'codicon-loading';
    case 'success':
      return 'codicon-pass text-green-01';
    case 'failed':
      return 'codicon-error text-red-01';
  }
};
