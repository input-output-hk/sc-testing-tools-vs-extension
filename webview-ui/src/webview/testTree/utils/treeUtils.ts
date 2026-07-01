/** Returns true if the node or any of its descendants match the filter string. */
export const nodeMatchesFilter = (node: TreeNode, filter: string, testList: TestList): boolean => {
  const lowerFilter = filter.toLowerCase();
  if (node.type === 'test') {
    return testList[(node as TreeTestNode).testId].name.toLowerCase().includes(lowerFilter);
  }
  const group = node as TreeGroupNode;
  return (
    group.name.toLowerCase().includes(lowerFilter) ||
    Object.values(group.nodes).some((child) => nodeMatchesFilter(child, filter, testList))
  );
};

/** Collects all test IDs nested within a group, recursively. */
export const getGroupTestIds = (group: TreeGroupNode): Array<number> => {
  const testIds: Array<number> = [];
  for (const node of Object.values(group.nodes)) {
    if (node.type === 'test') {
      testIds.push((node as TreeTestNode).testId);
    } else if (node.type === 'group') {
      testIds.push(...getGroupTestIds(node as TreeGroupNode));
    }
  }
  return testIds;
};
