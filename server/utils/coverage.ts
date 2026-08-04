import type { SrcLocRanges as CoverageRanges } from '../schemas/streaming-events';

const toRangeKey = (startLine: number, startCol: number, endLine: number, endCol: number): string => {
  return `${startLine}:${startCol}:${endLine}:${endCol}`;
};

export const createCoverage = (items: CoverageRanges[], testId?: TestId): FileCoverageMap => {
  const coverage: FileCoverageMap = {};
  updateCoverage(coverage, items, testId);
  return coverage;
};

export const updateCoverage = (coverage: FileCoverageMap, items: CoverageRanges[], testId?: TestId): void => {
  for (const item of items) {
    const fileCoverage: FileCoverage =
      coverage[item.file] ??
      { fileUri: item.file, statements: {} };
    
    for (let i = 0; i < item.startLines.length; i++) {
      const rangeKey = toRangeKey(
        item.startLines[i] - 1,
        item.startCols[i] - 1,
        item.endLines[i] - 1,
        item.endCols[i] - 1,
      );
      
      if (!fileCoverage.statements[rangeKey]) {
        fileCoverage.statements[rangeKey] = [];
      }

      if (testId !== undefined) {
        fileCoverage.statements[rangeKey].push(testId);
      }
    }

    coverage[item.file] = fileCoverage;
  }
};