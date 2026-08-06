export const getFileName = (uri: string): string => {
  const decoded = decodeURIComponent(uri);
  const segments = decoded.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? decoded;
};

export type CoverageTree = Record<string, Record<string, Array<CoverageFileSummary>>>;

export const groupFilesByPackageSuite = (files: Array<CoverageFileSummary>): CoverageTree => {
  const tree: CoverageTree = {};
  for (const file of files) {
    if (!tree[file.packageName]) tree[file.packageName] = {};
    if (!tree[file.packageName][file.suiteName]) tree[file.packageName][file.suiteName] = [];
    tree[file.packageName][file.suiteName].push(file);
  }
  return tree;
};

export const getGroupPercentage = (files: Array<CoverageFileSummary>): number => {
  const total = files.reduce((sum, file) => sum + file.total, 0);
  const covered = files.reduce((sum, file) => sum + file.covered, 0);
  return total === 0 ? 0 : Math.round((covered / total) * 100);
};
