import { addRxPlugin, createRxDatabase, RxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';

import { databaseCollections, type DatabaseCollections } from './collections';

import {
  handleTestTree,
  buildTestTree
} from './methods/testTree';

import {
  getAllTestSuitesIds,
  handleBuildTestSuite,
  handleBuildTestTreeFailed,
  handleTestSuiteUpdateEvent,
  onTestSuiteUpdate,
  onTestSuiteStatusUpdate
} from './methods/suite';

import {
  handleTestUpdateEvent,
  handleTestContextEvent,
  handleTestRunFailed,
  handleRunTests,
  getTest,
  getTestsByGroup,
  onTestUpdate
} from './methods/test';

import {
  getCoverage,
  getCoverageForFile,
  getCoverageForTest,
  onCoverageUpdate
} from './methods/coverage';

import {
  getTestRounds
} from './methods/round';

addRxPlugin(RxDBUpdatePlugin);

export default class Database {
  private database: RxDatabase<DatabaseCollections> | null = null;

  public async initialize(): Promise<void> {
    this.database = await createRxDatabase<DatabaseCollections>({
      name: 'pbt',
      storage: getRxStorageMemory()
    });

    await this.database.addCollections(databaseCollections);
  }

  public async handleTestSuiteUpdateEvent(event: TestSuiteUpdateEvent): Promise<void> {
    return await handleTestSuiteUpdateEvent(this.database!, event);
  }

  public async handleTestUpdateEvent(event: TestUpdateEvent): Promise<void> {
    return await handleTestUpdateEvent(this.database!, event);
  }

  public async handleTestContextEvent(event: TestContextEvent): Promise<void> {
    return await handleTestContextEvent(this.database!, event);
  }

  public async handleTestRunFailed(testRun: TestRun, prefetchTree: TestTree | null): Promise<void> {
    return await handleTestRunFailed(this.database!, testRun, prefetchTree);
  }

  public async handleBuildTestTreeFailed(testSuiteId: TestSuiteId, prefetchTree: TestTree | null): Promise<void> {
    return await handleBuildTestTreeFailed(this.database!, testSuiteId, prefetchTree);
  }

  public async handleTestTree(testTree: TestTree): Promise<void> {
    return await handleTestTree(this.database!, testTree);
  }

  public async buildTestTree(prefetchTree: TestTree, openState: Record<string, boolean>): Promise<TestTree> {
    return await buildTestTree(this.database!, prefetchTree, openState);
  }

  public async handleRunTests(testIds: Array<RunTestId>): Promise<void> {
    return await handleRunTests(this.database!, testIds);
  }

  public async handleBuildTestSuite(testSuiteId: TestSuiteId): Promise<void> {
    return await handleBuildTestSuite(this.database!, testSuiteId);
  }

  public async getCoverage(): Promise<Array<FileCoverage>> {
    return await getCoverage(this.database!);
  }

  public async getCoverageForFile(fileUri: string): Promise<CoverageStatements> {
    return await getCoverageForFile(this.database!, fileUri);
  }

  public async getCoverageForTest(id: TestId): Promise<Array<FileCoverage>> {
    return await getCoverageForTest(this.database!, id);
  }

  public async getTest(testId: TestId): Promise<Test> {
    return await getTest(this.database!, testId);
  }

  public async getTestRounds(id: TestId): Promise<Array<TestRound>> {
    return await getTestRounds(this.database!, id);
  }

  public async getTestsByGroup(testId: TestId, group: Array<string>): Promise<Array<Test>> {
    return await getTestsByGroup(this.database!, testId, group);
  }

  public async getAllTestSuitesIds(): Promise<Array<TestSuiteId>> {
    return await getAllTestSuitesIds(this.database!);
  }

  public onTestUpdate(callback: (test: Test) => void): void {
    onTestUpdate(this.database!, callback);
  }

  public onTestSuiteUpdate(openState: Record<string, boolean>, callback: ({ packageId, suite }: TestSuiteUpdate) => void): void {
    onTestSuiteUpdate(this.database!, openState, callback);
  }

  public onTestSuiteStatusUpdate(callback: ({ suiteId, status }: TestSuiteStatusUpdate) => void): void {
    onTestSuiteStatusUpdate(this.database!, callback);
  }

  public onCoverageUpdate(callback: (fileCoverage: FileCoverage) => void): void {
    onCoverageUpdate(this.database!, callback);
  }
}
