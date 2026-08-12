import * as vscode from 'vscode';
import { createHash } from 'node:crypto';

import type { Database, PackageDocument, CoverageDocument } from '../collections';

interface CoverageStats{
  total: number;
  covered: number;
}

const makeFileHash = (fileUri: string): string => {
  return createHash('sha256').update(fileUri).digest('hex');
}

const toCoverageFilePath = (packagePath: string, fileUri: string): string => {
  return vscode.Uri.joinPath(vscode.Uri.file(packagePath), fileUri).fsPath;
}

const keyToRange = (key: string): vscode.Range => {
  const [startLine, startChar, endLine, endChar] = key.split(':').map(Number);
  return new vscode.Range(startLine, startChar, endLine, endChar);
}

const rangeToKey = (range: TestRange): string => {
  return [
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  ].join(':');
}

const clearRangesIntersections = (ranges: Array<vscode.Range>): Array<vscode.Range> => {
  const sortedRanges = ranges.sort((a, b) => {
    if (a.start.line !== b.start.line) {
      return a.start.line - b.start.line;
    }
    return a.start.character - b.start.character;
  });

  const result: Array<vscode.Range> = [];

  let current: vscode.Range | null = null;
  for (const next of sortedRanges) {
    if (!current) {
      current = next;
    } else {
      if (!current.intersection(next)) {
        result.push(current);
        current = next;
      } else {
        current = current.union(next);
      }
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

const calculateRangesCoverage = (fileLines: Array<string>, ranges: Array<vscode.Range>): number => {
  return clearRangesIntersections(ranges).reduce((covered, range) => {
    if (range.start.line === range.end.line) {
      return covered + (range.end.character - range.start.character);
    } else {
      let count = 0;
      for (let line = range.start.line; line <= range.end.line; line++) {
        if (line === range.start.line) {
          count += fileLines[line].length - range.start.character;
        } else if (line === range.end.line) {
          count += range.end.character;
        } else {
          count += fileLines[line].length;
        }
      }
      return covered + count;
    }
  }, 0);
}

const calculateCoverageStats = async (document: Partial<CoverageDocument>): Promise<CoverageStats> => {
  if (!document.filePath) {
    return { total: 0, covered: 0 };
  }

  const fileBuffer = await vscode.workspace.fs.readFile(vscode.Uri.file(document.filePath));
  const fileContent = Buffer.from(fileBuffer).toString('utf-8');
  const fileLines = fileContent.split('\n');

  const covered: Array<vscode.Range> = [];
  for (const statement of document.statements || []) {
    covered.push(new vscode.Range(
      statement.range.start.line,
      statement.range.start.character,
      statement.range.end.line,
      statement.range.end.character
    ));
  }

  const index: Array<vscode.Range> = [];
  for (const range of document.index || []) {
    index.push(new vscode.Range(
      range.start.line,
      range.start.character,
      range.end.line,
      range.end.character
    ));
  }

  return {
    total: calculateRangesCoverage(fileLines, index),
    covered: calculateRangesCoverage(fileLines, covered)
  };
}

export const upsertCoverage = async (
  database: Database,
  packageId: TestPackageId,
  coverage: Array<TestEventCoverage>
): Promise<void> => {
  const packageDocument: PackageDocument | null = await database.packages.findOne({
    selector: { id: packageId.join(':') }
  }).exec();

  if (packageDocument !== null) {
    const packagePath = packageDocument.packagePath;
    for (const fileCoverage of coverage) {
      const filePath = toCoverageFilePath(packagePath, fileCoverage.fileUri);
      const fileHash = makeFileHash(filePath);
      
      const coverageDocument: CoverageDocument | null = await database.coverage.findOne({
        selector: { fileHash }
      }).exec();

      if (coverageDocument === null) {
        await database.coverage.insert({
          fileHash,
          filePath,
          context: {
            basePath: packagePath,
            workspaceId: fileCoverage.workspaceId,
            packageName: fileCoverage.packageName,
            suiteName: fileCoverage.suiteName
          },
          index: Object.entries(fileCoverage.statements)
            .filter(([, testIds]) => testIds.length === 0)
            .map(([rangeKey]) => keyToRange(rangeKey)),
          statements: Object.entries(fileCoverage.statements)
            .filter(([, testIds]) => testIds.length > 0)
            .map(([rangeKey, testIds]) => ({
              range: keyToRange(rangeKey), testIds
            })),
        });
      } else {
        const statements = coverageDocument.statements;
        for (const [rangeKey, testIds] of Object.entries(fileCoverage.statements)) {
          const existingStatement = statements.find(statement => rangeToKey(statement.range) === rangeKey);
          if (existingStatement) {
            existingStatement.testIds = Array.from(new Set([...existingStatement.testIds, ...testIds]));
          } else {
            statements.push({ range: keyToRange(rangeKey), testIds });
          }
        }
        await coverageDocument.update({ $set: { statements } });
      }
    }
  }
}

export const clearCoverageForTest = async (database: Database, id: TestId): Promise<void> => {
  const [workspaceId, packageName, suiteName, testId] = id;
  const documents: Array<CoverageDocument> = await database.coverage.find({
    selector: {
      'context.workspaceId': workspaceId,
      'context.packageName': packageName,
      'context.suiteName': suiteName,
      'statements': { $elemMatch: { testIds: { $elemMatch: { $eq: testId } } } }
    }
  }).exec();

  for (const document of documents) {
    await document.update({
      $set: {
        statements: document.statements.map(statement => ({
          ...statement,
          testIds: statement.testIds.filter(id => id !== testId)
        }))
      }
    });
  }
}

export const getCoverage = async (database: Database): Promise<Array<FileCoverage>> => {
  const coverage: Array<FileCoverage> = [];
  const documents: Array<CoverageDocument> = await database.coverage.find().exec();
  for (const document of documents) {
    const { total, covered } = await calculateCoverageStats(document);
    coverage.push({
      fileHash: document.fileHash,
      filePath: document.filePath,
      context: document.context,
      total,
      covered,
    });
  }
  return coverage;
}

export const getCoverageForFile = async (database: Database, fileUri: string): Promise<CoverageStatements> => {
  const filePath = vscode.Uri.parse(fileUri).fsPath;
  const fileHash = makeFileHash(filePath);

  const coverageDocument: CoverageDocument | null = await database.coverage.findOne({
    selector: { fileHash }
  }).exec();

  if (coverageDocument === null) return {};

  const statements: CoverageStatements = {};

  for (const range of coverageDocument.index) {
    statements[[
      range.start.line,
      range.start.character,
      range.end.line,
      range.end.character
    ].join(':')] = [];
  }

  for (const statement of coverageDocument.statements) {
    statements[[
      statement.range.start.line,
      statement.range.start.character,
      statement.range.end.line,
      statement.range.end.character
    ].join(':')] = statement.testIds;
  }

  return statements;
}

export const getCoverageForTest = async (database: Database, id: TestId): Promise<Array<FileCoverage>> => {
  const [workspaceId, packageName, suiteName, testId] = id;

  const coverage: Array<FileCoverage> = [];
  const documents: Array<CoverageDocument> = await database.coverage.find({
    selector: {
      'context.workspaceId': workspaceId,
      'context.packageName': packageName,
      'context.suiteName': suiteName,
      'statements': { $elemMatch: { testIds: { $elemMatch: { $eq: testId } } } }
    }
  }).exec();
  
  for (const document of documents) {
    const { total, covered } = await calculateCoverageStats(document);
    coverage.push({
      fileHash: document.fileHash,
      filePath: document.filePath,
      context: document.context,
      total,
      covered,
    });
  }

  return coverage;
}

export const onCoverageUpdate = (database: Database, callback: (fileCoverage: FileCoverage) => void): void => {
  database.coverage.$.subscribe(async changeEvent => {
    if (changeEvent.operation === 'INSERT' || changeEvent.operation === 'UPDATE') {
      const document = changeEvent.documentData;
      const { total, covered } = await calculateCoverageStats(document);
      callback({
        fileHash: document.fileHash,
        filePath: document.filePath,
        context: document.context,
        total,
        covered
      });
    }
  });
};