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

const keyToRange = (key: string): TestRange => {
  const [startLine, startChar, endLine, endChar] = key.split(':').map(Number);
  return {
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar }
  };
}

const rangeToKey = (range: TestRange): string => {
  return [
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  ].join(':');
}

const calculateCoverageStats = (document: Partial<CoverageDocument>, testId?: string): CoverageStats => {
  if (!document.filePath) {
    return { total: 0, covered: 0 };
  }

  const covered = new Set<string>();
  for (const statement of document.statements || []) {
    if (testId) {
      if (!statement.testIds.includes(testId)) continue;
    } else {
      if (statement.testIds.length === 0) continue;
    }
    covered.add(rangeToKey(statement.range));
  }

  const index = new Set<string>();
  for (const range of document.index || []) {
    index.add(rangeToKey(range));
  }

  return {
    total: index.size,
    covered: covered.size
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
    const { total, covered } = calculateCoverageStats(document);
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
    const { total, covered } = calculateCoverageStats(document, testId);
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
  database.coverage.$.subscribe(changeEvent => {
    if (changeEvent.operation === 'INSERT' || changeEvent.operation === 'UPDATE') {
      const document = changeEvent.documentData;
      const { total, covered } = calculateCoverageStats(document);
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