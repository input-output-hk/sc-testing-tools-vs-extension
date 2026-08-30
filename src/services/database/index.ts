import { addRxPlugin, createRxDatabase, RxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';

import { databaseCollections, type DatabaseCollections } from './collections';

import {
  handleTestTree,
  buildTestTree
} from './methods/testTree';

import {
  getPackage
} from './methods/package';

import {
  getAllTestSuitesIds,
  handleTestSuiteBuild,
  handleTestSuiteBuildErrorEvent,
  handleTestSuiteUpdateEvent,
  onTestSuiteUpdate,
  onTestSuiteStatusUpdate
} from './methods/suite';

import {
  handleTestUpdateEvent,
  handleTestContextEvent,
  handleTestRunErrorEvent,
  handleTestRun,
  getTest,
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

  public async handleTestRunErrorEvent(event: TestRunErrorEvent, prefetchTree: TestTree | null): Promise<void> {
    return await handleTestRunErrorEvent(this.database!, event, prefetchTree);
  }

  public async handleTestSuiteBuildErrorEvent(event: TestSuiteBuildErrorEvent, prefetchTree: TestTree | null): Promise<void> {
    return await handleTestSuiteBuildErrorEvent(this.database!, event, prefetchTree);
  }

  public async handleTestTree(testTree: TestTree): Promise<void> {
    return await handleTestTree(this.database!, testTree);
  }

  public async buildTestTree(prefetchTree: TestTree, openState: Record<string, boolean>): Promise<TestTree> {
    return await buildTestTree(this.database!, prefetchTree, openState);
  }

  public async handleTestRun(testIds: Array<RunnableTestId>): Promise<void> {
    return await handleTestRun(this.database!, testIds);
  }

  public async handleTestSuiteBuild(testSuiteId: TestSuiteId): Promise<void> {
    return await handleTestSuiteBuild(this.database!, testSuiteId);
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

  public async getPackage(packageId: TestPackageId): Promise<TestPackage> {
    return await getPackage(this.database!, packageId);
  }

  public async getTest(testId: TestId): Promise<Test> {
    return await getTest(this.database!, testId);
  }

  public async getTestRounds(id: TestId): Promise<Array<TestRound>> {
    return await getTestRounds(this.database!, id);
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
