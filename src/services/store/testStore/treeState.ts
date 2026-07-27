function getGroupPathKey(path: Array<string>): string {
  return JSON.stringify(path);
}

export function getSuiteRunIds(tree: TestTree): Array<string> {
  const ids: Array<string> = [];

  for (const node of Object.values(tree)) {
    if (node.type === 'test') {
      ids.push((node as TestTreeTestNode).testId);
    } else if (node.type === 'group') {
      ids.push(...getSuiteRunIds((node as TestTreeGroupNode).nodes));
    }
  }

  return ids;
}

export function removeSuiteTests(tree: TestTree, tests: TestList): void {
  for (const node of Object.values(tree)) {
    if (node.type === 'test') {
      const testId = (node as TestTreeTestNode).testId;
      delete tests[testId];
      continue;
    }

    if (node.type === 'group') {
      removeSuiteTests((node as TestTreeGroupNode).nodes, tests);
    }
  }
}

export function collectGroupOpenState(
  tree: TestTree,
  parentPath: Array<string> = [],
  state: Record<string, boolean> = {},
): Record<string, boolean> {
  for (const node of Object.values(tree)) {
    if (node.type !== 'group') {
      continue;
    }

    const groupNode = node as TestTreeGroupNode;
    const groupPath = [...parentPath, groupNode.name];
    const pathKey = getGroupPathKey(groupPath);

    state[pathKey] = state[pathKey] || groupNode.isOpen;
    collectGroupOpenState(groupNode.nodes, groupPath, state);
  }

  return state;
}

export function restoreGroupOpenState(
  tree: TestTree,
  state: Record<string, boolean>,
  parentPath: Array<string> = [],
): void {
  for (const node of Object.values(tree)) {
    if (node.type !== 'group') {
      continue;
    }

    const groupNode = node as TestTreeGroupNode;
    const groupPath = [...parentPath, groupNode.name];
    const pathKey = getGroupPathKey(groupPath);

    if (state[pathKey] !== undefined) {
      groupNode.isOpen = state[pathKey];
    }

    restoreGroupOpenState(groupNode.nodes, state, groupPath);
  }
}
