export const updateTestSuiteTree = (testTree: TestTree, { packageId, suite }: TestSuiteTreeUpdate): TestTree => {
  const packageNode = testTree.packages[packageId.join(':')];
  if (!packageNode) return testTree;

  return {
    ...testTree,
    packages: {
      ...testTree.packages,
      [packageId.join(':')]: {
        ...packageNode,
        suites: {
          ...packageNode.suites,
          [suite.name]: {
            ...packageNode.suites[suite.name],
            ...suite
          },
        },
      },
    },
  };
};

const updateTestNodeMap = (nodes: TestTreeNodeMap, test: Test): { nodes: TestTreeNodeMap; updated: boolean } => {
  let updated = false;
  const testId = test.id.join(':');
  const nextNodes: TestTreeNodeMap = {};

  for (const [key, node] of Object.entries(nodes)) {
    if (node.type === 'test') {
      const testNode = node as TestTreeTestNode;
      if (testNode.test.id.join(':') === testId) {
        nextNodes[key] = {
          ...testNode,
          test: {
            ...testNode.test,
            ...test,
          },
        } as TestTreeTestNode;
        updated = true;
      } else {
        nextNodes[key] = node;
      }

      continue;
    }

    const groupNode = node as TestTreeGroupNode;
    const updatedGroupNodes = updateTestNodeMap(groupNode.nodes, test);

    if (updatedGroupNodes.updated) {
      nextNodes[key] = {
        ...groupNode,
        nodes: updatedGroupNodes.nodes,
      } as TestTreeGroupNode;
      updated = true;
    } else {
      nextNodes[key] = node;
    }
  }

  return {
    nodes: updated ? nextNodes : nodes,
    updated,
  };
};

export const updateTest = (testTree: TestTree, { test }: { test: Test }): TestTree => {
  const [workspaceId, packageName, suiteName] = test.id;
  const packageId = `${workspaceId}:${packageName}`;

  const packageNode = testTree.packages[packageId];
  if (!packageNode) return testTree;

  const suiteNode = packageNode.suites[suiteName];
  if (!suiteNode) return testTree;

  const updatedTestTreeNodeMap = updateTestNodeMap(suiteNode.tests, test);
  if (!updatedTestTreeNodeMap.updated) return testTree;

  return {
    ...testTree,
    packages: {
      ...testTree.packages,
      [packageId]: {
        ...packageNode,
        suites: {
          ...packageNode.suites,
          [suiteName]: {
            ...suiteNode,
            tests: updatedTestTreeNodeMap.nodes,
          },
        },
      },
    },
  };
};

export const updateTestSuite = (
  testTree: TestTree,
  { suiteId, status, time }: TestSuiteUpdate,
): TestTree => {
  const [workspaceId, packageName, suiteName] = suiteId;
  const packageId = `${workspaceId}:${packageName}`;

  const packageNode = testTree.packages[packageId];
  if (!packageNode) return testTree;

  const suiteNode = packageNode.suites[suiteName];
  if (!suiteNode || suiteNode.status === status) return testTree;

  return {
    ...testTree,
    packages: {
      ...testTree.packages,
      [packageId]: {
        ...packageNode,
        suites: {
          ...packageNode.suites,
          [suiteName]: {
            ...suiteNode,
            status,
            time,
          },
        },
      },
    },
  };
};

export const updateOpenTestTreeNode = (
  testTree: TestTree,
  isOpen: boolean,
  workspaceId: string,
  packageName: string,
  suiteName?: string,
  path?: Array<string>
): TestTree => {
  const packageNode = testTree.packages[`${workspaceId}:${packageName}`];
  if (!packageNode) return testTree;

  if (!suiteName) {
    packageNode.isOpen = isOpen;
    return testTree;
  }

  const suiteNode = packageNode.suites[suiteName];
  if (!suiteNode) return testTree;

  if (!path) {
    suiteNode.isOpen = isOpen;
    return testTree;
  }

  let groupNode: TestTreeNode | null = null;
  for (const group of path) {
    if (groupNode === null) {
      groupNode = suiteNode.tests[group] || null;
    } else if (groupNode.type === 'group') {
      groupNode = (groupNode as TestTreeGroupNode).nodes[group] || null;
    }

    if (groupNode === null) break;
  }
  
  if (groupNode === null || groupNode.type !== 'group') return testTree;

  (groupNode as TestTreeGroupNode).isOpen = isOpen;

  return testTree;
};