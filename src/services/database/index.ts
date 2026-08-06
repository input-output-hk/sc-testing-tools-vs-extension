import { Range, Position, Uri } from 'vscode';
import { createHash } from 'node:crypto';
import { addRxPlugin, createRxDatabase, RxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';

import { createTestTree } from '../../utils/testTree';

import {
  packageSchema,
  type PackageCollection,
  type PackageDocument
} from './package';

import {
  suiteSchema,
  type SuiteCollection,
  type SuiteDocument
} from './suite';

import {
  testSchema,
  type TestCollection,
  type TestDocument
} from './test';

import {
  coverageSchema,
  type CoverageCollection,
  type CoverageDocument
} from './coverage';

type DatabaseCollections = {
  packages: PackageCollection,
  suites: SuiteCollection,
  tests: TestCollection,
  coverage: CoverageCollection,
};

type StoredStatement = {
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  testIds: Array<{ workspaceId: string; packageName: string; suiteName: string; testId: string }>;
};

addRxPlugin(RxDBUpdatePlugin);

export default class Database {
  private database: RxDatabase<DatabaseCollections> | null = null;

  public async initialize(): Promise<void> {
    this.database = await createRxDatabase<DatabaseCollections>({
      name: 'pbt',
      storage: getRxStorageMemory()
    });

    await this.database.addCollections({
      packages: {
        schema: packageSchema,
      },
      suites: {
        schema: suiteSchema,
      },
      tests: {
        schema: testSchema,
      },
      coverage: {
        schema: coverageSchema,
      },
    });
  }

  private makeFileHash(fileUri: string): string {
    return createHash('sha256').update(fileUri).digest('hex');
  }

  private keyToRange(key: string): Range {
    const [startLine, startChar, endLine, endChar] = key.split(':').map(Number);
    return new Range(new Position(startLine, startChar), new Position(endLine, endChar));
  }

  private statementsToMap(statements: ReadonlyArray<StoredStatement>): Record<string, Array<TestId>> {
    const map: Record<string, Array<TestId>> = {};
    for (const statement of statements) {
      const rangeKey = [
        statement.range.start.line,
        statement.range.start.character,
        statement.range.end.line,
        statement.range.end.character
      ].join(':');

      map[rangeKey] = statement.testIds.map(testId => [
        testId.workspaceId,
        testId.packageName,
        testId.suiteName,
        testId.testId
      ]);
    }
    return map;
  }

  private mapToStatements(map: Record<string, Array<TestId>>): Array<StoredStatement> {
    return Object.entries(map).map(([rangeKey, testIds]) => ({
      range: this.keyToRange(rangeKey),
      testIds: testIds.map(([workspaceId, packageName, suiteName, testId]) => ({
        workspaceId,
        packageName,
        suiteName,
        testId,
      }))
    }));
  }

  // Source locations reported by the test binary (test locations, coverage file paths) are
  // relative to the package directory, not absolute — resolve them against the package's
  // known packagePath into real, openable file URIs.
  private async resolvePackagePath(workspaceId: string, packageName: string): Promise<string | null> {
    const packageDocument: PackageDocument | null = await this.database!.packages.findOne({
      selector: { workspaceId, packageName }
    }).exec();
    return packageDocument?.packagePath ?? null;
  }

  private toAbsoluteUri(packagePath: string | null, relativePath: string): string {
    return packagePath === null ? relativePath : Uri.file(`${packagePath}/${relativePath}`).toString();
  }

  private async computeSuiteStatus(suite: SuiteDocument): Promise<RunStatus> {
    const tests: Array<TestDocument> = await this.database!.tests.find({
      selector: {
        workspaceId: suite.workspaceId,
        packageName: suite.packageName,
        suiteName: suite.suiteName,
      }
    }).exec();

    if (tests.some(test => test.status === 'running')) return 'running';
    if (tests.some(test => test.status === 'invalid')) return 'invalid';
    if (tests.every(test => test.status === 'valid')) return 'valid';

    return 'undetermined';
  }

  private async upsertTests(workspaceId: string, packageName: string, suiteName: string, tests: Array<Test>): Promise<void> {
    const existingTests: Array<TestDocument> = await this.database!.tests.find({
      selector: {
        workspaceId,
        packageName,
        suiteName,
      }
    }).exec();

    const createTests: Set<string> = new Set(tests.map(test => test.id.join(':')));
    const removeTests: Array<string> = [];
    for (const existingTest of existingTests) {
      const { workspaceId, packageName, suiteName, testId } = existingTest;
      const id = `${workspaceId}:${packageName}:${suiteName}:${testId}`;
      if (!createTests.has(id)) {
        removeTests.push(id);
      } else {
        createTests.delete(id);
      }
    }

    const packagePath = await this.resolvePackagePath(workspaceId, packageName);

    await this.database!.tests.bulkInsert(
      tests
        .filter(test => createTests.has(test.id.join(':')))
        .map(test => ({
          id: test.id.join(':'),
          workspaceId,
          packageName,
          suiteName,
          testId: test.id[3],
          name: test.name,
          group: test.group,
          status: test.status,
          location: test.location ? {
            uri: this.toAbsoluteUri(packagePath, test.location.uri),
            range: test.location.range,
          } : undefined,
          time: test.time,
          percentage: test.percentage,
        }))
    );

    await this.database!.tests.bulkRemove(removeTests);
  }

  private async resetCoverage(workspaceId: string, packageName: string, suiteName: string, coverage: Array<FileCoverage>): Promise<void> {
    const packagePath = await this.resolvePackagePath(workspaceId, packageName);
    await this.database!.coverage.bulkUpsert(coverage.map(fileCoverage => {
      const fileUri = this.toAbsoluteUri(packagePath, fileCoverage.fileUri);
      return {
        fileHash: this.makeFileHash(fileUri),
        fileUri,
        packageName,
        suiteName,
        statements: this.mapToStatements(fileCoverage.statements),
      };
    }));
  }

  private async mergeCoverage(workspaceId: string, packageName: string, suiteName: string, coverage: Array<FileCoverage>): Promise<void> {
    const packagePath = await this.resolvePackagePath(workspaceId, packageName);
    for (const fileCoverage of coverage) {
      const fileUri = this.toAbsoluteUri(packagePath, fileCoverage.fileUri);
      const fileHash = this.makeFileHash(fileUri);
      const existing: CoverageDocument | null = await this.database!.coverage.findOne({
        selector: { fileHash }
      }).exec();

      const merged = existing ? this.statementsToMap(existing.statements) : {};
      for (const [rangeKey, testIds] of Object.entries(fileCoverage.statements)) {
        const existingTestIds = merged[rangeKey] ?? [];
        const seen = new Set(existingTestIds.map(testId => testId.join(':')));
        merged[rangeKey] = [
          ...existingTestIds,
          ...testIds.filter(testId => !seen.has(testId.join(':'))),
        ];
      }

      await this.database!.coverage.upsert({
        fileHash,
        fileUri,
        packageName,
        suiteName,
        statements: this.mapToStatements(merged),
      });
    }
  }

  public async handleTestSuiteUpdateEvent(event: TestSuiteUpdateEvent): Promise<void> {
    const { workspaceId, packageName, suiteName, runStatus, tests, coverage } = event.payload;

    if (tests !== undefined) {
      await this.upsertTests(workspaceId, packageName, suiteName, tests);
    }

    if (coverage !== undefined) {
      await this.resetCoverage(workspaceId, packageName, suiteName, coverage);
    }

    const suiteDocument: SuiteDocument | null = await this.database!.suites.findOne({
      selector: { workspaceId, packageName, suiteName }
    }).exec();

    if (suiteDocument !== null) {
      const treeVersion = tests !== undefined ? suiteDocument.treeVersion + 1 : suiteDocument.treeVersion;
      
      let status: RunStatus = runStatus === 'running' ? 'running' : 'undetermined';
      if (runStatus === 'done') {
        status = await this.computeSuiteStatus(suiteDocument);
      }
      
      await suiteDocument.update({ $set: { status, treeVersion } });
    }
  }

  public async handleTestUpdateEvent(event: TestUpdateEvent): Promise<void> {
    const { id, status, time, percentage } = event.payload;
    const [workspaceId, packageName, suiteName, testId] = id;

    const testDocument: TestDocument | null = await this.database!.tests.findOne({
      selector: { workspaceId, packageName, suiteName, testId }
    }).exec();

    if (testDocument !== null) {
      const updateData: Partial<TestDocument> = {};
      if (status !== undefined) updateData.status = status;
      if (time !== undefined) updateData.time = time;
      if (percentage !== undefined) updateData.percentage = percentage;

      await testDocument.update({ $set: updateData });
    }
  }

  public async handleTestContextEvent(event: TestContextEvent): Promise<void> {
    const [workspaceId, packageName, suiteName] = event.payload.id;
    await this.mergeCoverage(workspaceId, packageName, suiteName, event.payload.coverage);
  }

  public async handleTestRunFailed(testRun: TestRun): Promise<void> {
    const { workspaceId, packageName, suiteName, testIds } = testRun;

    const suiteDocument: SuiteDocument | null = await this.database!.suites.findOne({
      selector: { workspaceId, packageName, suiteName }
    }).exec();
    
    if (suiteDocument !== null) {
      if (testIds !== undefined) {
        await this.database!.tests
          .findByIds(testIds.map(testId => `${workspaceId}:${packageName}:${suiteName}:${testId}`))
          .update({ $set: { status: 'invalid' } });
      } else {
        await this.database!.tests
          .find({ selector: { workspaceId, packageName, suiteName } })
          .update({ $set: { status: 'invalid' } });
      }

      await suiteDocument.update({ $set: { status: 'invalid' } });
    }
  }

  public async handleTestTree(testTree: TestTree): Promise<void> {
    const packages: Array<Partial<PackageDocument>> = [];
    const suites: Array<Partial<SuiteDocument>> = [];

    for (const testPackage of Object.values(testTree.packages)) {
      packages.push({
        id: `${testPackage.workspace.id}:${testPackage.name}`,
        workspaceId: testPackage.workspace.id,
        workspacePath: testPackage.workspace.path,
        packageName: testPackage.name,
        packagePath: testPackage.packagePath
      });

      for (const suite of Object.values(testPackage.suites)) {
        suites.push({
          id: `${testPackage.workspace.id}:${testPackage.name}:${suite.name}`,
          workspaceId: testPackage.workspace.id,
          packageName: testPackage.name,
          suiteName: suite.name,
          status: suite.status,
          treeVersion: 0,
        });
      }
    }

    await this.database!.packages.bulkUpsert(packages);
    await this.database!.suites.bulkUpsert(suites);
  }

  public async buildTestTree(prefetchTree: TestTree, openState: Record<string, boolean>): Promise<TestTree> {
    const testTree: TestTree = { packages: { ...prefetchTree.packages } };
    for (const packageNode of Object.values(testTree.packages)) {
      packageNode.isOpen = openState[[packageNode.workspace.id, packageNode.name].join(':')] ?? false;
      for (const suiteNode of Object.values(packageNode.suites)) {
        suiteNode.isOpen = openState[[packageNode.workspace.id, packageNode.name, suiteNode.name].join(':')] ?? false;
      }
    }

    const packageDocuments: Array<PackageDocument> = await this.database!.packages.find().exec();
    for (const packageDocument of packageDocuments) {
      const packageId: TestPackageId = [packageDocument.workspaceId, packageDocument.packageName];
      const packageNode: TestPackage = {
        workspace: {
          id: packageDocument.workspaceId,
          path: packageDocument.workspacePath
        },
        name: packageDocument.packageName,
        packagePath: packageDocument.packagePath,
        isOpen: openState[packageId.join(':')] ?? false,
        suites: {}
      };

      const suiteDocuments: Array<SuiteDocument> = await this.database!.suites.find({
        selector: {
          workspaceId: packageDocument.workspaceId,
          packageName: packageDocument.packageName
        }
      }).exec();

      for (const suiteDocument of suiteDocuments) {
        const suiteId: TestSuiteId = [suiteDocument.workspaceId, suiteDocument.packageName, suiteDocument.suiteName];
        const suiteNode: TestSuite = {
          name: suiteDocument.suiteName,
          status: suiteDocument.status as RunStatus,
          isOpen: openState[suiteId.join(':')] ?? false,
          tests: {}
        };
        packageNode.suites[suiteNode.name] = suiteNode;

        const testDocuments: Array<TestDocument> = await this.database!.tests.find({
          selector: {
            workspaceId: suiteDocument.workspaceId,
            packageName: suiteDocument.packageName,
            suiteName: suiteDocument.suiteName
          }
        }).exec();

        const tests: Array<Test> = testDocuments.map(testDocument => ({
          id: [
            testDocument.workspaceId,
            testDocument.packageName,
            testDocument.suiteName,
            testDocument.testId
          ],
          name: testDocument.name,
          group: testDocument.group,
          status: testDocument.status as RunStatus,
          location: testDocument.location ? {
            uri: testDocument.location.uri,
            range: new Range(
              testDocument.location.range.start.line,
              testDocument.location.range.start.character,
              testDocument.location.range.end.line,
              testDocument.location.range.end.character
            )
          } : undefined,
          time: testDocument.time,
          percentage: testDocument.percentage
        }));

        suiteNode.tests = createTestTree(suiteId, openState, tests);
      }
      
      const packageKey = packageId.join(':');
      if (!testTree.packages[packageKey]) {
        testTree.packages[packageKey] = packageNode;
      } else {
        for (const [suiteName, suiteNode] of Object.entries(packageNode.suites)) {
          if (
            !testTree.packages[packageKey].suites[suiteName] ||
            Object.keys(suiteNode.tests).length > 0
          ) {
            testTree.packages[packageKey].suites[suiteName] = suiteNode;
          }
        }
      }
    }

    return testTree;
  }

  public async handleRunTests(testIds: Array<RunTestId>): Promise<void> {
    const suites: Set<string> = new Set();
    for (const [workspaceId, packageName, suiteName] of testIds) {
      suites.add(`${workspaceId}:${packageName}:${suiteName}`);
    }

    await this.database!.tests
      .findByIds(
        Array.from(testIds)
          .filter(id => id[3] !== undefined)
          .map(
            ([workspaceId, packageName, suiteName, testId]) =>
              `${workspaceId}:${packageName}:${suiteName}:${testId}`
          )
      )
      .update({ $set: { status: 'waiting' } });

    await this.database!.tests
      .find({
        selector: {
          $or: Array.from(testIds)
            .filter(id => id[3] === undefined)
            .map(
              ([workspaceId, packageName, suiteName]) =>
                ({ workspaceId, packageName, suiteName })
            )
        }
      })
      .update({ $set: { status: 'waiting' } });

    await this.database!.suites
      .findByIds(Array.from(suites))
      .update({ $set: { status: 'running' } });
  }

  public async getCoverageForFile(fileUri: string): Promise<FileCoverage | null> {
    const fileHash = this.makeFileHash(fileUri);
    const coverageDocument: CoverageDocument | null = await this.database!.coverage.findOne({
      selector: { fileHash }
    }).exec();

    if (coverageDocument === null) return null;

    return {
      fileUri: coverageDocument.fileUri,
      statements: this.statementsToMap(coverageDocument.statements)
    };
  }

  private async buildFileSummary(file: { fileUri: string; packageName: string; suiteName: string; statements: ReadonlyArray<StoredStatement> }): Promise<CoverageFileSummary> {
    const statements = this.statementsToMap(file.statements);
    const rangeKeys = Object.keys(statements);
    const totalStatements = rangeKeys.length;

    const testIdByComposite = new Map<string, TestId>();
    for (const testIds of Object.values(statements)) {
      for (const testId of testIds) {
        testIdByComposite.set(testId.join(':'), testId);
      }
    }

    const testDocuments: Map<string, TestDocument> = testIdByComposite.size === 0
      ? new Map()
      : await this.database!.tests.findByIds(Array.from(testIdByComposite.keys())).exec();
    const nameByComposite = new Map(Array.from(testDocuments.values()).map(testDocument => [testDocument.id, testDocument.name]));

    const tests: Array<CoverageTestSummary> = Array.from(testIdByComposite.entries()).map(([compositeId, testId]) => {
      const covered = rangeKeys.filter(rangeKey => statements[rangeKey].some(id => id.join(':') === compositeId)).length;
      return {
        testId: compositeId,
        name: nameByComposite.get(compositeId) ?? testId[3],
        percentage: totalStatements === 0 ? 0 : Math.round((covered / totalStatements) * 100),
      };
    });

    const coveredStatements = rangeKeys.filter(rangeKey => statements[rangeKey].length > 0).length;

    return {
      uri: file.fileUri,
      packageName: file.packageName,
      suiteName: file.suiteName,
      percentage: totalStatements === 0 ? 0 : Math.round((coveredStatements / totalStatements) * 100),
      tests,
    };
  }

  public async getCoverageSummary(): Promise<CoverageFileSummary[]> {
    const coverageDocuments: Array<CoverageDocument> = await this.database!.coverage.find().exec();
    const summaries = await Promise.all(coverageDocuments.map(doc => this.buildFileSummary(doc)));
    return summaries.sort((a, b) => a.uri.localeCompare(b.uri));
  }

  public onCoverageUpdate(callback: (file: CoverageFileSummary) => void): void {
    this.database!.coverage.$.subscribe(changeEvent => {
      if (changeEvent.operation === 'DELETE') return;
      this.buildFileSummary(changeEvent.documentData).then(callback);
    });
  }

  public onTestUpdate(callback: (test: Test) => void): void {
    this.database!.tests.update$.subscribe(changeEvent => {
      const document = changeEvent.documentData;
      callback({
        id: [
          document.workspaceId,
          document.packageName,
          document.suiteName,
          document.testId
        ],
        name: document.name,
        group: document.group,
        status: document.status as RunStatus,
        location: document.location ? {
          uri: document.location.uri,
          range: new Range(
            document.location.range.start.line,
            document.location.range.start.character,
            document.location.range.end.line,
            document.location.range.end.character
          )
        } : undefined,
        time: document.time,
        percentage: document.percentage
      });
    });
  }

  public onTestSuiteUpdate(openState: Record<string, boolean>, callback: ({ packageId, suite }: TestSuiteUpdate) => void): void {
    this.database!.suites.update$.subscribe(async changeEvent => {
      const document = changeEvent.documentData;
      const prevVersion = changeEvent.previousDocumentData?.treeVersion;
      if (prevVersion !== document.treeVersion) {
        const testDocuments: Array<TestDocument> = await this.database!.tests.find({
          selector: {
            workspaceId: document.workspaceId,
            packageName: document.packageName,
            suiteName: document.suiteName
          }
        }).exec();

        const tests: Array<Test> = testDocuments.map(testDocument => ({
          id: [
            testDocument.workspaceId,
            testDocument.packageName,
            testDocument.suiteName,
            testDocument.testId
          ],
          name: testDocument.name,
          group: testDocument.group,
          status: testDocument.status as RunStatus,
          location: testDocument.location ? {
            uri: testDocument.location.uri,
            range: new Range(
              testDocument.location.range.start.line,
              testDocument.location.range.start.character,
              testDocument.location.range.end.line,
              testDocument.location.range.end.character
            )
          } : undefined,
          time: testDocument.time,
          percentage: testDocument.percentage
        }));

        const packageId: TestPackageId = [document.workspaceId, document.packageName];
        const suiteId: TestSuiteId = [...packageId, document.suiteName];
        const testTree = createTestTree(suiteId, openState, tests);
        const suite: TestSuite = {
          name: document.suiteName,
          status: document.status as RunStatus,
          tests: testTree,
          isOpen: openState[suiteId.join(':')] ?? false,
        };

        callback({ packageId, suite });
      }
    });
  }

  public onTestSuiteStatusUpdate(callback: ({ suiteId, status }: TestSuiteStatusUpdate) => void): void {
    this.database!.suites.update$.subscribe(changeEvent => {
      const document = changeEvent.documentData;
      const prevStatus = changeEvent.previousDocumentData?.status;
      if (prevStatus !== document.status) {
        callback({ 
          suiteId: [
            document.workspaceId,
            document.packageName,
            document.suiteName
          ], 
          status: document.status as RunStatus 
        });
      }
    });
  }
}