
export const getSortedKeys = (coverageTree: CoverageTree): Array<string> => {
  return Object
    .keys(coverageTree)
    .sort((keyA, keyB) => {
      const isNodeAGroup = Object.hasOwn(coverageTree[keyA], 'nodes');
      const isNodeBGroup = Object.hasOwn(coverageTree[keyB], 'nodes');
      if (isNodeAGroup && !isNodeBGroup) {
        return +1;
      } else if (!isNodeAGroup && isNodeBGroup) {
        return -1;
      } else {
        return keyA.localeCompare(keyB);
      }
    });
};