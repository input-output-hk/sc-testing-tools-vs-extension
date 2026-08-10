export const getFileName = (relativePath: string): string => {
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? relativePath;
};

export type CoverageFolderNode = {
  folders: Record<string, CoverageFolderNode>;
  files: Array<CoverageFileSummary>;
};

const createFolderNode = (): CoverageFolderNode => ({ folders: {}, files: [] });

export type CoverageTree = Record<string, Record<string, CoverageFolderNode>>;

export const groupFilesByPackageSuiteFolder = (files: Array<CoverageFileSummary>): CoverageTree => {
  const tree: CoverageTree = {};
  for (const file of files) {
    if (!tree[file.packageName]) tree[file.packageName] = {};
    if (!tree[file.packageName][file.suiteName]) tree[file.packageName][file.suiteName] = createFolderNode();

    const segments = file.relativePath.split(/[\\/]/).filter(Boolean);
    const folderSegments = segments.slice(0, -1);

    let node = tree[file.packageName][file.suiteName];
    for (const segment of folderSegments) {
      if (!node.folders[segment]) node.folders[segment] = createFolderNode();
      node = node.folders[segment];
    }
    node.files.push(file);
  }
  return tree;
};
