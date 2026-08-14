export const getFileName = (relativePath: string): string => {
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? relativePath;
};

export const getFileRelativePath = (file: FileCoverage): string => {
  return file.filePath.slice(file.context.basePath.length).replace(/^[\\/]+/, '');
};

export const getFilePercentage = (file: FileCoverage): number => {
  const { total, covered } = file;
  if (total === 0 || covered === 0) return 0;
  return Math.max(1, Math.round((covered / total) * 100));
};

export type CoverageFolderNode = {
  folders: Record<string, CoverageFolderNode>;
  files: Array<FileCoverage>;
};

const createFolderNode = (): CoverageFolderNode => ({ folders: {}, files: [] });

export type CoverageTree = Record<string, Record<string, CoverageFolderNode>>;

export const groupFilesByPackageSuiteFolder = (files: Array<FileCoverage>): CoverageTree => {
  const tree: CoverageTree = {};
  for (const file of files) {
    const { packageName, suiteName } = file.context;
    if (!tree[packageName]) tree[packageName] = {};
    if (!tree[packageName][suiteName]) tree[packageName][suiteName] = createFolderNode();

    const segments = getFileRelativePath(file).split(/[\\/]/).filter(Boolean);
    const folderSegments = segments.slice(0, -1);

    let node = tree[packageName][suiteName];
    for (const segment of folderSegments) {
      if (!node.folders[segment]) node.folders[segment] = createFolderNode();
      node = node.folders[segment];
    }
    node.files.push(file);
  }
  return tree;
};
