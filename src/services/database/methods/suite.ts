import { Range } from 'vscode';

import { upsertTests } from './test';
import { upsertCoverage } from './coverage';
import { createTestTree, updateTestTreeSuiteStatus } from '../../../utils/testTree';

import type { Database, SuiteDocument, TestDocument } from '../collections';

export const getAllTestSuitesIds = async (database: Database): Promise<Array<TestSuiteId>> => {
  const suiteDocuments: Array<SuiteDocument> = await database.suites.find().exec();
  return suiteDocuments.map(suite => [suite.workspaceId, suite.packageName, suite.suiteName]);
}

export const handleBuildTestSuite = async (database: Database, testSuiteId: TestSuiteId): Promise<void> => {
  const [workspaceId, packageName, suiteName] = testSuiteId;
  const suiteDocument: SuiteDocument | null = await database.suites.findOne({
    selector: { id: `${workspaceId}:${packageName}:${suiteName}` }
  }).exec();

  if (suiteDocument !== null) {
    await suiteDocument.update({ $set: { status: 'running' } });
  }
}

export const handleBuildTestTreeFailed = async (
  database: Database,
  testSuiteId: TestSuiteId,
  prefetchTree: TestTree | null
): Promise<void> => {
  const [workspaceId, packageName, suiteName] = testSuiteId;
  if (prefetchTree !== null) {
    updateTestTreeSuiteStatus(prefetchTree, testSuiteId, 'invalid');
  }
  await database.suites
    .findOne({ selector: { id: `${workspaceId}:${packageName}:${suiteName}` } })
    .update({ $set: { status: 'invalid' } });
}

const computeSuiteStatus = async (database: Database, suite: SuiteDocument): Promise<RunStatus> => {
  const tests: Array<TestDocument> = await database.tests.find({
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

export const handleTestSuiteUpdateEvent = async (database: Database, event: TestSuiteUpdateEvent): Promise<void> => {
  const { workspaceId, packageName, suiteName, runStatus, tests, coverageIndex } = event.payload;

  if (tests !== undefined) {
    await upsertTests(database, workspaceId, packageName, suiteName, tests);
  }

  if (coverageIndex !== undefined) {
    await upsertCoverage(database, [workspaceId, packageName], coverageIndex);
  }

  const suiteDocument: SuiteDocument | null = await database.suites.findOne({
    selector: { id: `${workspaceId}:${packageName}:${suiteName}` }
  }).exec();

  if (suiteDocument !== null) {
    const update: any = {
      $set: {
        treeVersion: tests !== undefined ? suiteDocument.treeVersion + 1 : suiteDocument.treeVersion
      }
    };
    if (runStatus === 'running') {
      update['$set']['status'] = 'running';
    } else if (runStatus === 'done' || runStatus === 'idle') {
      update['$set']['status'] = await computeSuiteStatus(database, suiteDocument);
    }
    await suiteDocument.update(update);
  }
}

export const onTestSuiteUpdate = (
  database: Database,
  openState: Record<string, boolean>,
  callback: ({ packageId, suite }: TestSuiteUpdate) => void
): void => {
  database.suites.update$.subscribe(async changeEvent => {
    const document = changeEvent.documentData;
    const prevVersion = changeEvent.previousDocumentData?.treeVersion;
    if (prevVersion !== document.treeVersion) {
      const testDocuments: Array<TestDocument> = await database.tests.find({
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

export const onTestSuiteStatusUpdate = (
  database: Database,
  callback: ({ suiteId, status }: TestSuiteStatusUpdate) => void
): void => {
  database.suites.update$.subscribe(changeEvent => {
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