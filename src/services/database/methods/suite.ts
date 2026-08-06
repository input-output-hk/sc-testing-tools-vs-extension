import { Range } from 'vscode';

import { upsertTests } from './test';
import { upsertCoverage } from './coverage';
import { createTestTree } from '../../../utils/testTree';

import type { Database, SuiteDocument, TestDocument } from '../collections';

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
  const { workspaceId, packageName, suiteName, runStatus, tests, coverage } = event.payload;

  if (tests !== undefined) {
    await upsertTests(database, workspaceId, packageName, suiteName, tests);
  }

  if (coverage !== undefined) {
    await upsertCoverage(database, [workspaceId, packageName], coverage);
  }

  const suiteDocument: SuiteDocument | null = await database.suites.findOne({
    selector: { id: `${workspaceId}:${packageName}:${suiteName}` }
  }).exec();

  if (suiteDocument !== null) {
    const treeVersion = tests !== undefined ? suiteDocument.treeVersion + 1 : suiteDocument.treeVersion;
    
    let status: RunStatus = runStatus === 'running' ? 'running' : 'undetermined';
    if (runStatus === 'done') {
      status = await computeSuiteStatus(database, suiteDocument);
    }
    
    await suiteDocument.update({ $set: { status, treeVersion } });
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