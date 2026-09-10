import { Range } from 'vscode';

import { updateSuiteTests } from './test';
import { upsertCoverage } from './coverage';
import { createTestTree } from '../../../utils/testTree';

import type { Database, SuiteDocument, SuiteDocumentData, TestDocument } from '../collections';

export const getAllTestSuitesIds = async (database: Database): Promise<Array<TestSuiteId>> => {
  const suiteDocuments: Array<SuiteDocument> = await database.suites.find().exec();
  return suiteDocuments.map(suite => [suite.workspaceId, suite.packageName, suite.suiteName]);
}

export const handleTestSuiteBuild = async (database: Database, testSuiteId: TestSuiteId): Promise<void> => {
  await database.suites
    .findOne({ selector: { id: testSuiteId.join(':') } })
    .update({ $set: { isWaiting: true } });
}

export const handleTestSuiteBuildErrorEvent = async (database: Database, testJob: TestBuildJob): Promise<void> => {
  const { workspace: { id: workspaceId }, packageName, suiteName } = testJob.params;
  await database.suites
    .findOne({ selector: { id: `${workspaceId}:${packageName}:${suiteName}` } })
    .update({ $set: { status: 'invalid', isWaiting: false, isRunning: false } });
}

const computeSuiteStatus = async (database: Database, suite: SuiteDocument): Promise<RunStatus> => {
  const tests: Array<TestDocument> = await database.tests.find({
    selector: {
      workspaceId: suite.workspaceId,
      packageName: suite.packageName,
      suiteName: suite.suiteName,
    }
  }).exec();

  if (tests.some(test => test.status === 'invalid')) {
    return 'invalid';
  } else if (tests.every(test => test.status === 'valid')) {
    return 'valid';
  }

  return 'undetermined';
}

const computeSuiteTime = async (database: Database, suite: SuiteDocument): Promise<number> => {
  const tests: Array<TestDocument> = await database.tests.find({
    selector: {
      workspaceId: suite.workspaceId,
      packageName: suite.packageName,
      suiteName: suite.suiteName,
    }
  }).exec();

  return tests.map(t => t.time ?? 0).reduce((sum, time) => sum + time, 0);
}

export const handleTestSuiteUpdateEvent = async (database: Database, event: TestSuiteUpdateEvent): Promise<void> => {
  const { workspaceId, packageName, suiteName, runStatus, tests, coverageIndex } = event.payload;
  const packageId: TestPackageId = [workspaceId, packageName];
  const suiteId: TestSuiteId = [...packageId, suiteName];

  const suiteDocument: SuiteDocument | null = await database.suites.findOne({
    selector: { id: `${workspaceId}:${packageName}:${suiteName}` }
  }).exec();

  const suiteIsStatic: boolean = suiteDocument?.isStatic ?? true;

  if (tests !== undefined) {
    await updateSuiteTests(database, suiteId, tests, suiteIsStatic);
  }

  if (coverageIndex !== undefined) {
    await upsertCoverage(database, packageId, coverageIndex);
  }

  if (suiteDocument !== null) {
    const update: Partial<SuiteDocumentData> = {
      treeVersion: tests !== undefined ? suiteDocument.treeVersion + 1 : suiteDocument.treeVersion,
      isStatic: tests !== undefined ? false : suiteDocument.isStatic,
    };
    if (runStatus === 'running') {
      update.time = undefined;
      update.isRunning = true;
      update.isWaiting = false;
    } else if (runStatus === 'done' || runStatus === 'idle') {
      const status = await computeSuiteStatus(database, suiteDocument);
      update.status = status;
      update.isRunning = false;
      update.isWaiting = false;
      if (runStatus === 'done') {
        update.time = await computeSuiteTime(database, suiteDocument);
      }
    }
    await suiteDocument.update({ $set: update });
  }
}

export const onTestSuiteUpdate = (
  database: Database,
  openState: Record<string, boolean>,
  callback: (params: TestSuiteUpdate) => void
): void => {
  database.suites.update$.subscribe(async changeEvent => {
    const document = changeEvent.documentData;

    const update: TestSuiteUpdate = {
      suiteId: [document.workspaceId, document.packageName, document.suiteName]
    };

    if (document.time !== changeEvent.previousDocumentData?.time) {
      update.time = document.time;
    }

    if (document.status !== changeEvent.previousDocumentData?.status) {
      update.status = document.status as RunStatus;
    }

    if (document.isWaiting !== changeEvent.previousDocumentData?.isWaiting) {
      update.isWaiting = document.isWaiting;
    }

    if (document.isRunning !== changeEvent.previousDocumentData?.isRunning) {
      update.isRunning = document.isRunning;
    }

    if (document.treeVersion !== changeEvent.previousDocumentData?.treeVersion) {
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
        isWaiting: testDocument.isWaiting,
        isRunning: testDocument.isRunning,
        isStatic: testDocument.isStatic,
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

      update.name = document.suiteName;
      update.status = document.status as RunStatus;
      update.isWaiting = document.isWaiting;
      update.isRunning = document.isRunning;
      update.isStatic = document.isStatic;
      update.time = document.time;
      update.tests = createTestTree(suiteId, openState, tests);
      update.isOpen = openState[suiteId.join(':')] ?? false;
    }

    callback(update);
  });
}