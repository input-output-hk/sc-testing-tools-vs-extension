import * as path from 'path';

import { TestInfo } from '../../../../shared/streaming-events';

import {
  collectGroupOpenState,
  getSuiteRunIds,
  removeSuiteTests,
  restoreGroupOpenState,
} from './treeState';

export interface SuiteHydrationContext {
  tests: TestList;
  packages: TestPackageList | null;
  notifyTestPackagesUpdate: () => void;
  logLine: (message: string) => void;
}

export function hydrateSuiteTestsFromRun(
  packageName: string,
  suiteName: string,
  testInfos: Array<TestInfo>,
  context: SuiteHydrationContext,
): void {
  const testPackage = context.packages?.[packageName];
  const testSuite = testPackage?.suites[suiteName];

  if (!testPackage || !testSuite) return;

  const previousGroupOpenState = collectGroupOpenState(testSuite.tree);
  const previousTestsByRunId = getSuiteTestsByRunId(testSuite.tree, context.tests);

  if (testInfos.length === 0) {
    context.logLine(`No tests reported in suite_started for ${packageName}/${suiteName}; keeping current tree state.`);
    testSuite.status = 'running';
    context.notifyTestPackagesUpdate();
    return;
  }

  removeSuiteTests(testSuite.tree, context.tests);
  testSuite.tree = {};

  for (const testInfo of testInfos) {
    const authoritativeTest = buildAuthoritativeTestFromInfo(
      testPackage.packagePath,
      packageName,
      suiteName,
      testInfo,
      previousTestsByRunId.get(testInfo.id),
    );
    context.tests[authoritativeTest.id] = authoritativeTest;
    createTestTreeNode(testSuite.tree, authoritativeTest);
  }

  restoreGroupOpenState(testSuite.tree, previousGroupOpenState);

  testSuite.status = 'running';
  context.notifyTestPackagesUpdate();
}

function getSuiteTestsByRunId(tree: TestTree, tests: TestList): Map<number, Test> {
  const previousByRunId = new Map<number, Test>();

  for (const testId of getSuiteRunIds(tree)) {
    const test = tests[testId];
    if (!test || !Number.isInteger(test.runId)) {
      continue;
    }

    previousByRunId.set(test.runId as number, test);
  }

  return previousByRunId;
}

function buildAuthoritativeTestFromInfo(
  packagePath: string,
  packageName: string,
  suiteName: string,
  testInfo: TestInfo,
  previousTest?: Test,
): Test {
  const testId = `${packageName}:${suiteName}:${testInfo.id}`;
  const sourceLocation = testInfo.srcLoc;
  const location: Location = {
    uri: sourceLocation?.file ? path.join(packagePath, sourceLocation.file) : '',
    startLine: sourceLocation?.startLine ?? 1,
    startCharacter: sourceLocation?.startCol ?? 1,
    endLine: sourceLocation?.endLine ?? (sourceLocation?.startLine ?? 1),
    endCharacter: sourceLocation?.endCol ?? (sourceLocation?.startCol ?? 1),
  };

  return {
    id: testId,
    name: testInfo.name,
    group: testInfo.path,
    location,
    status: previousTest?.status === 'running' ? 'running' : 'undetermined',
    source: 'authoritative',
    isRunnable: true,
    runId: testInfo.id,
    isPlaceholder: false,
    time: previousTest?.status === 'running' ? 0 : undefined,
    percentage: previousTest?.status === 'running' ? 0 : undefined,
  };
}

function createTestTreeNode(tree: TestTree, test: Test): void {
  if (test.group.length === 0) {
    tree[test.id] = { type: 'test', testId: test.id } as TestTreeTestNode;
    return;
  }

  let node: TestTreeGroupNode | null = null;
  for (const group of test.group) {
    if (node === null) {
      node = getTestTreeGroupNode(tree, group);
    } else {
      node = getTestTreeGroupNode(node.nodes, group);
    }
  }

  node!.nodes[test.id] = { type: 'test', testId: test.id } as TestTreeTestNode;
}

function getTestTreeGroupNode(nodes: TestTree, group: string): TestTreeGroupNode {
  if (nodes[group] !== undefined) {
    return nodes[group] as TestTreeGroupNode;
  }

  const newNode = { type: 'group', isOpen: false, name: group, nodes: {} } as TestTreeGroupNode;
  nodes[group] = newNode;
  return newNode;
}
