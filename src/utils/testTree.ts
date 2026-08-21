
const createTestTreeNode = (
  suiteId: TestSuiteId,
  openState: Record<string, boolean>,
  nodes: TestTreeNodeMap,
  test: Test
): void => {
  if (test.group.length === 0) {
    nodes[test.id.join(':')] = { type: 'test', test } as TestTreeTestNode;
    return;
  }

  let node: TestTreeGroupNode | null = null;
  for (let i = 0; i < test.group.length; i++) {
    const isOpen = openState[[...suiteId, ...test.group.slice(0, i+1)].join(':')] ?? false;
    
    if (node === null) {
      node = getTestTreeGroupNode(nodes, test.group[i], isOpen);
    } else {
      node = getTestTreeGroupNode(node.nodes, test.group[i], isOpen);
    }
  }

  node!.nodes[test.id.join(':')] = { type: 'test', test } as TestTreeTestNode;
};

const getTestTreeGroupNode = (
  nodes: TestTreeNodeMap,
  group: string,
  isOpen: boolean
): TestTreeGroupNode => {
  if (nodes[group] !== undefined) {
    return nodes[group] as TestTreeGroupNode;
  }
  
  const newNode = { type: 'group', isOpen, name: group, nodes: {} } as TestTreeGroupNode;
  nodes[group] = newNode;
  return newNode;
};

export const createTestTree = (
  suiteId: TestSuiteId,
  openState: Record<string, boolean>,
  tests: Array<Test>
): TestTreeNodeMap => {
  const nodes: TestTreeNodeMap = {};
  for (const test of tests) createTestTreeNode(suiteId, openState, nodes, test);
  return nodes;
};

const updateTestTreeNodeStatus = (testTree: TestTreeNodeMap, status: RunStatus): void => {
  for (const node of Object.values(testTree)) {
    if (node.type === 'test') {
      (node as TestTreeTestNode).test.status = status;
    } else {
      updateTestTreeNodeStatus((node as TestTreeGroupNode).nodes, status);
    }
  }
}

export const updateTestTreeSuiteStatus = (
  testTree: TestTree,
  testSuiteId: TestSuiteId,
  status: RunStatus
): void => {
  const [workspaceId, packageName, suiteName] = testSuiteId;
  if (Object.hasOwn(testTree.packages, `${workspaceId}:${packageName}`)) {
    const packageNode = testTree.packages[`${workspaceId}:${packageName}`];
    if (Object.hasOwn(packageNode.suites, suiteName)) {
      const suiteNode = packageNode.suites[suiteName];
      updateTestTreeNodeStatus(suiteNode.tests, status);
      suiteNode.status = status;
    }
  }
};