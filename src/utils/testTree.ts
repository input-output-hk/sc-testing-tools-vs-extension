
const createTestTreeNode = (nodes: TestTreeNodeMap, test: Test): void => {
  if (test.group.length === 0) {
    nodes[test.id.join(':')] = { type: 'test', test } as TestTreeTestNode;
    return;
  }

  let node: TestTreeGroupNode | null = null;
  for (const group of test.group) {
    if (node === null) {
      node = getTestTreeGroupNode(nodes, group);
    } else {
      node = getTestTreeGroupNode(node.nodes, group);
    }
  }

  node!.nodes[test.id.join(':')] = { type: 'test', test } as TestTreeTestNode;
};

const getTestTreeGroupNode = (nodes: TestTreeNodeMap, group: string): TestTreeGroupNode => {
  if (nodes[group] !== undefined) {
    return nodes[group] as TestTreeGroupNode;
  }
  
  const newNode = { type: 'group', isOpen: false, name: group, nodes: {} } as TestTreeGroupNode;
  nodes[group] = newNode;
  return newNode;
};

export const createTestTree = (tests: Array<Test>): TestTreeNodeMap => {
  const nodes: TestTreeNodeMap = {};
  for (const test of tests) createTestTreeNode(nodes, test);
  return nodes;
};
