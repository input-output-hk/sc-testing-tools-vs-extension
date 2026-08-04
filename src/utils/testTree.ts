
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

  const isOpen = openState[[...suiteId, ...test.group].join(':')] ?? false;

  let node: TestTreeGroupNode | null = null;
  for (const group of test.group) {
    if (node === null) {
      node = getTestTreeGroupNode(nodes, group, isOpen);
    } else {
      node = getTestTreeGroupNode(node.nodes, group, isOpen);
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
