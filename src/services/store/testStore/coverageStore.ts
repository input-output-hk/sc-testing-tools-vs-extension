import * as vscode from 'vscode';

import { SrcLocRanges } from '../../../../shared/streaming-events';

const GLOBAL_KEY = '#all_tests#';

export type StatementCoverage = {
  executed: number;
  range: vscode.Range;
};

type FileCoverage = { [key: string]: StatementCoverage };

export default class CoverageStore {
  private baseCoverageIndex: { [uri: string]: FileCoverage } = {};
  private coverageRanges: { [uri: string]: { [testId: string]: FileCoverage } } = {};
  private compareCoverageTo: { [testId: string]: string } = {};

  public setBaseCoverageIndex(packagePath: string, coverageIndex: SrcLocRanges[]): void {
    this.baseCoverageIndex = Object.fromEntries(
      coverageIndex.map((coverage) => [
        vscode.Uri.file(packagePath + '/' + coverage.file).toString(),
        toFileCoverage(coverage, 0),
      ]),
    );
  }

  public setComparison(testId: string, compareToTestId: string): void {
    this.compareCoverageTo[testId] = compareToTestId;
  }

  public addCovered(packagePath: string, covered: SrcLocRanges[], testItemId: string): void {
    for (const cov of covered) {
      const covData = toFileCoverage(cov, 1);
      const uri = vscode.Uri.file(packagePath + '/' + cov.file).toString();
      this.coverageRanges[uri] ||= {};
      this.coverageRanges[uri][GLOBAL_KEY] ||= {};
      this.coverageRanges[uri][testItemId] ||= {};

      for (const key of Object.keys(covData)) {
        const coverage = covData[key];
        if (!this.coverageRanges[uri][GLOBAL_KEY][key]?.executed) {
          this.coverageRanges[uri][GLOBAL_KEY][key] = coverage;
        } else {
          this.coverageRanges[uri][GLOBAL_KEY][key].executed++;
        }

        if (!this.coverageRanges[uri][testItemId][key]?.executed) {
          this.coverageRanges[uri][testItemId][key] = coverage;
        } else {
          this.coverageRanges[uri][testItemId][key].executed++;
        }
      }
    }
  }

  public getCoverage(
    fileUri: vscode.Uri,
    testItemId?: string,
    outputChannel?: vscode.OutputChannel,
  ): StatementCoverage[] {
    const testKey = testItemId || GLOBAL_KEY;
    const allDetails = this.coverageRanges[fileUri.toString()];
    if (!allDetails) {
      outputChannel?.appendLine(`No coverage found for ${fileUri}, only for ${Object.keys(this.coverageRanges)}`);
      return [];
    }

    const details = allDetails[testKey];
    if (!details) {
      outputChannel?.appendLine(`No coverage found for ${testItemId}, only for ${Object.keys(allDetails)}`);
      return [];
    }

    const comparisonKey = this.compareCoverageTo[testKey];
    if (comparisonKey) {
      const compare = allDetails[comparisonKey] || {};
      const result: StatementCoverage[] = [];
      for (const key of Object.keys(details)) {
        if (!compare[key]) {
          result.push(details[key]);
        }
      }
      for (const key of Object.keys(compare)) {
        if (!details[key]) {
          result.push({ executed: 0, range: compare[key].range });
        }
      }
      return result;
    }

    const base = this.baseCoverageIndex[fileUri.toString()];
    if (!base) {
      outputChannel?.appendLine(`No coverage index found for ${fileUri}, only for ${Object.keys(this.baseCoverageIndex)}`);
      return [];
    }

    return Object.values(Object.assign({}, base, details));
  }
}

function toFileCoverage(covData: SrcLocRanges, executed: number): FileCoverage {
  return Object.fromEntries(
    covData.startLines.map((startLine, i) => {
      const startCol = covData.startCols[i];
      const endLine = covData.endLines[i];
      const endCol = covData.endCols[i];
      const range = new vscode.Range(
        new vscode.Position(startLine - 1, startCol - 1),
        new vscode.Position(endLine - 1, endCol - 1),
      );
      return [`${startLine},${startCol}-${endLine},${endCol}`, { executed, range }];
    }),
  );
}
