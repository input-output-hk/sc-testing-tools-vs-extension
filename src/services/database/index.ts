import { Range, Position } from 'vscode';
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
          location: test.location,
          time: test.time,
          percentage: test.percentage,
        }))
    );

    await this.database!.tests.bulkRemove(removeTests);
  }

  private async upsertCoverage(coverage: Array<FileCoverage>): Promise<void> {
    await this.database!.coverage.bulkUpsert(coverage.map(fileCoverage => ({
      fileHash: this.makeFileHash(fileCoverage.fileUri),
      fileUri: fileCoverage.fileUri,
      statements: Object.entries(fileCoverage.statements).map(([rangeKey, testIds]) => ({
        range: this.keyToRange(rangeKey),
        testIds: testIds.map(([workspaceId, packageName, suiteName, testId]) => ({
          workspaceId,
          packageName,
          suiteName,
          testId,
        }))
      }))
    })));
  }

  public async handleTestSuiteUpdateEvent(event: TestSuiteUpdateEvent): Promise<void> {
    const { workspaceId, packageName, suiteName, runStatus, tests, coverage } = event.payload;

    if (tests !== undefined) {
      await this.upsertTests(workspaceId, packageName, suiteName, tests);
    }

    if (coverage !== undefined) {
      await this.upsertCoverage(coverage);
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
    await this.upsertCoverage(event.payload.coverage);
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

    const statements: Record<string, Array<TestId>> = {};
    for (const statement of coverageDocument.statements) {
      const range = [
        statement.range.start.line,
        statement.range.start.character,
        statement.range.end.line,
        statement.range.end.character
      ].join(':');

      const testIds: Array<TestId> = statement.testIds.map(testId => [
        testId.workspaceId,
        testId.packageName,
        testId.suiteName,
        testId.testId
      ]);

      statements[range] = testIds;
    }

    return {
      fileUri: coverageDocument.fileUri,
      statements
    };
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

  public onTestSuiteUpdate(callback: ({ packageId, suite }: TestSuiteUpdate) => void): void {
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

        const testTree = createTestTree(testDocuments.map(testDocument => ({
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
        })));

        const packageId: TestPackageId = [document.workspaceId, document.packageName];
        const suite: TestSuite = {
          name: document.suiteName,
          status: document.status as RunStatus,
          tests: testTree,
          isOpen: false,
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