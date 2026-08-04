const updateTestTreeNode = (oldNode: TestTreeNode, newNode: TestTreeNode): void => {
  if (oldNode.type !== newNode.type) return;
  if (oldNode.type === 'test' && newNode.type === 'test') {
    (oldNode as TestTreeTestNode).test = (newNode as TestTreeTestNode).test;
  } else if (oldNode.type === 'group' && newNode.type === 'group') {
    const oldGroupNode = oldNode as TestTreeGroupNode;
    const newGroupNode = newNode as TestTreeGroupNode;
    for (const [key, oldChildNode] of Object.entries(oldGroupNode.nodes)) {
      const newChildNode = newGroupNode.nodes[key];
      if (newChildNode) {
        updateTestTreeNode(oldChildNode, newChildNode);
      } else {
        delete oldGroupNode.nodes[key];
      }
    }
    for (const [key, newChildNode] of Object.entries(newGroupNode.nodes)) {
      if (!oldGroupNode.nodes[key]) {
        oldGroupNode.nodes[key] = newChildNode;
      }
    }
  }
}

export const updateTestSuite = (testTree: TestTree, { packageId, suite }: TestSuiteUpdate): TestTree => {
  const packageNode = testTree.packages[packageId.join(':')];
  if (!packageNode) return testTree;

  const suiteNode = packageNode.suites[suite.name];
  if (!suiteNode) return testTree;

  for (const [key, oldNode] of Object.entries(suiteNode.tests)) {
    const newNode = suite.tests[key];
    if (newNode) {
      updateTestTreeNode(oldNode, newNode);
    } else {
      delete suiteNode.tests[key];
    }
  }

  for (const [key, newNode] of Object.entries(suite.tests)) {
    if (!suiteNode.tests[key]) {
      suiteNode.tests[key] = newNode;
    }
  }

  return testTree;
};

const updateTestNodeMap = (
  nodes: TestTreeNodeMap,
  joinedTestId: string,
  test: Test,
): { nodes: TestTreeNodeMap; updated: boolean } => {
  let updated = false;
  const nextNodes: TestTreeNodeMap = {};

  for (const [key, node] of Object.entries(nodes)) {
    if (node.type === 'test') {
      const testNode = node as TestTreeTestNode;
      if (testNode.test.id.join(':') === joinedTestId) {
        nextNodes[key] = {
          ...testNode,
          test: {
            ...testNode.test,
            time: test.time,
            status: test.status,
            percentage: test.percentage,
          },
        } as TestTreeTestNode;
        updated = true;
      } else {
        nextNodes[key] = node;
      }

      continue;
    }

    const groupNode = node as TestTreeGroupNode;
    const updatedGroupNodes = updateTestNodeMap(groupNode.nodes, joinedTestId, test);

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

  const updatedTestTreeNodeMap = updateTestNodeMap(suiteNode.tests, test.id.join(':'), test);
  if (!updatedTestTreeNodeMap.updated) return testTree;

  const updatedSuiteNode: TestSuite = {
    ...suiteNode,
    tests: updatedTestTreeNodeMap.nodes,
  };

  const updatedPackageNode: TestPackage = {
    ...packageNode,
    suites: {
      ...packageNode.suites,
      [suiteName]: updatedSuiteNode,
    },
  };

  return {
    ...testTree,
    packages: {
      ...testTree.packages,
      [packageId]: updatedPackageNode,
    },
  };
};

export const updateTestSuiteStatus = (
  testTree: TestTree,
  { suiteId, status }: TestSuiteStatusUpdate,
): TestTree => {
  const [workspaceId, packageName, suiteName] = suiteId;
  const packageId = `${workspaceId}:${packageName}`;

  const packageNode = testTree.packages[packageId];
  if (!packageNode) return testTree;

  const suiteNode = packageNode.suites[suiteName];
  if (!suiteNode || suiteNode.status === status) return testTree;

  const updatedSuiteNode: TestSuite = {
    ...suiteNode,
    status,
  };

  const updatedPackageNode: TestPackage = {
    ...packageNode,
    suites: {
      ...packageNode.suites,
      [suiteName]: updatedSuiteNode,
    },
  };

  return {
    ...testTree,
    packages: {
      ...testTree.packages,
      [packageId]: updatedPackageNode,
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