import { Range, Uri } from 'vscode';
import { createHash } from 'node:crypto';

import type { Database, PackageDocument, CoverageDocument } from '../collections';

const makeFileHash = (fileUri: string): string => {
  return createHash('sha256').update(fileUri).digest('hex');
}

// Canonicalizes to fsPath so the write side (packagePath + relative fileUri) and the read side
// (an editor's file:// URI) hash to the same key for the same physical file.
export const toCoverageFilePath = (packagePath: string, fileUri: string): string => {
  return Uri.joinPath(Uri.file(packagePath), fileUri).fsPath;
}

const keyToRange = (key: string): Range => {
  const [startLine, startChar, endLine, endChar] = key.split(':').map(Number);
  return new Range(startLine, startChar, endLine, endChar);
}

const rangeToKey = (range: TestRange): string => {
  return [
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  ].join(':');
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
          statements: Object.entries(fileCoverage.statements).map(([rangeKey, testIds]) => ({
            range: keyToRange(rangeKey), testIds
          }))
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

// Wipes each file back to a clean statement skeleton at the start of a full run, so a fresh
// run's percentages aren't polluted by testIds attributed during a previous run.
export const resetCoverage = async (
  database: Database,
  packageId: TestPackageId,
  coverage: Array<TestEventCoverage>
): Promise<void> => {
  const packageDocument: PackageDocument | null = await database.packages.findOne({
    selector: { id: packageId.join(':') }
  }).exec();

  if (packageDocument === null) return;

  const packagePath = packageDocument.packagePath;
  await database.coverage.bulkUpsert(coverage.map(fileCoverage => {
    const filePath = toCoverageFilePath(packagePath, fileCoverage.fileUri);
    return {
      fileHash: makeFileHash(filePath),
      filePath,
      context: {
        basePath: packagePath,
        workspaceId: fileCoverage.workspaceId,
        packageName: fileCoverage.packageName,
        suiteName: fileCoverage.suiteName,
      },
      statements: Object.entries(fileCoverage.statements).map(([rangeKey, testIds]) => ({
        range: keyToRange(rangeKey),
        testIds,
      })),
    };
  }));
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
    const statements: CoverageStatements = {};
    for (const statement of document.statements) {
      statements[[
        statement.range.start.line,
        statement.range.start.character,
        statement.range.end.line,
        statement.range.end.character
      ].join(':')] = statement.testIds;
    }
    coverage.push({
      fileHash: document.fileHash,
      filePath: document.filePath,
      context: document.context,
      statements
    });
  }
  return coverage;
}

export const getCoverageForFile = async (database: Database, fileUri: string): Promise<CoverageStatements> => {
  const filePath = Uri.parse(fileUri).fsPath;
  const fileHash = makeFileHash(filePath);

  const coverageDocument: CoverageDocument | null = await database.coverage.findOne({
    selector: { fileHash }
  }).exec();

  if (coverageDocument === null) return {};

  const statements: CoverageStatements = {};
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
    const statements: CoverageStatements = {};
    for (const statement of document.statements) {
      statements[[
        statement.range.start.line,
        statement.range.start.character,
        statement.range.end.line,
        statement.range.end.character
      ].join(':')] = statement.testIds;
    }
    coverage.push({
      fileHash: document.fileHash,
      filePath: document.filePath,
      context: document.context,
      statements
    });
  }

  return coverage;
}

export const onCoverageUpdate = (database: Database, callback: (fileCoverage: FileCoverage) => void): void => {
  database.coverage.$.subscribe(changeEvent => {
    if (changeEvent.operation === 'INSERT' || changeEvent.operation === 'UPDATE') {
      const document = changeEvent.documentData;
      const statements: CoverageStatements = {};
      for (const statement of document.statements) {
        statements[[
          statement.range.start.line,
          statement.range.start.character,
          statement.range.end.line,
          statement.range.end.character
        ].join(':')] = statement.testIds;
      }
      callback({
        fileHash: document.fileHash,
        filePath: document.filePath,
        context: document.context,
        statements
      });
    }
  });
};