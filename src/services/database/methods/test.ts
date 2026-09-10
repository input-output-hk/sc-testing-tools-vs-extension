import { Range } from 'vscode';

import { createRounds } from './round';
import { clearCoverageForTest, upsertCoverage } from './coverage';

import type { Database, SuiteDocument, TestDocument, TestDocumentData } from '../collections';

export const shouldUpdateSuiteTestList = async (database: Database, testSuiteId: TestSuiteId, testList: GenericMap<Test>): Promise<boolean> => {
  const [workspaceId, packageName, suiteName] = testSuiteId;
  const existingTests = await database.tests.find({
    selector: { workspaceId, packageName, suiteName }
  }).exec();

  const staticTestIds: Set<string> = new Set<string>(Object.keys(testList));
  const existingTestIds: Set<string> = new Set<string>(existingTests.map(test => test.id));

  if (staticTestIds.symmetricDifference(existingTestIds).size > 0) return true;

  for (const test of existingTests) {
    if (test.name.toLowerCase() !== testList[test.id].name.toLowerCase()) return true;
  }

  return false;
}

export const updateSuiteTests = async (database: Database, testSuiteId: TestSuiteId, tests: Array<Test>, suiteIsStatic: boolean): Promise<void> => {
  const [workspaceId, packageName, suiteName] = testSuiteId;

  const testList: GenericMap<Test> = {};
  for (const test of tests) {
    testList[test.id.join(':')] = test;
  }

  if (suiteIsStatic || await shouldUpdateSuiteTestList(database, testSuiteId, testList)) {
    await database.tests.find({
      selector: { workspaceId, packageName, suiteName }
    }).remove();

    await database.tests.bulkInsert(
      tests.map(test => ({
        id: test.id.join(':'),
        workspaceId: test.id[0],
        packageName: test.id[1],
        suiteName: test.id[2],
        testId: test.id[3],
        name: test.name,
        group: test.group,
        status: test.status,
        isWaiting: test.isWaiting,
        isRunning: test.isRunning,
        isStatic: test.isStatic,
        location: test.location,
        time: test.time,
        percentage: test.percentage,
      }))
    );
  }
}

export const handleTestUpdateEvent = async (database: Database, event: TestUpdateEvent): Promise<void> => {
  const { id, status, isRunning, time, percentage, type } = event.payload;

  const testDocument: TestDocument | null = await database.tests.findOne({
    selector: { id: id.join(':') }
  }).exec();

  if (testDocument !== null) {
    if (isRunning && !testDocument.isRunning) {
      await clearCoverageForTest(database, id);
    }

    const updateData: Partial<TestDocumentData> = {};
    if (time !== undefined) updateData.time = time;
    if (isRunning !== undefined) updateData.isRunning = isRunning;
    if (percentage !== undefined) updateData.percentage = percentage;
    if (isRunning === true) updateData.isWaiting = false;
    
    if (status !== undefined) {
      updateData.status = status;
      updateData.isRunning = false;
      if (testDocument.type === undefined) {
        if (type !== undefined) {
          updateData.type = type;
        } else {
          updateData.type = 'unit-test';
        }
      }
    }

    await testDocument.update({ $set: updateData });
  }
}

export const handleTestContextEvent = async (database: Database, event: TestContextEvent): Promise<void> => {
  const [workspaceId, packageName, suiteName, testId] = event.payload.context.testId;
  if (event.payload.context.type) {
    await database.tests
      .findOne({ selector: { id: `${workspaceId}:${packageName}:${suiteName}:${testId}` } })
      .update({ $set: { type: event.payload.context.type } });
  }
  await upsertCoverage(database, [workspaceId, packageName], event.payload.coverage);
  await createRounds(database, event.payload.rounds);
}

const getWorkspaceTestRuns = (workspace: Workspace, testIds: Array<RunnableTestId>): Array<TestRun> => {
  const testRunsMap: Map<string, Array<string>> = new Map();
  for (const id of testIds) {
    const [_, packageName, suiteName, testId] = id;
    const key = `${packageName}:${suiteName}`;
    if (!testRunsMap.has(key)) testRunsMap.set(key, []);
    if (testId !== undefined) testRunsMap.get(key)!.push(testId);
  }
  const testRuns: Array<TestRun> = [];
  for (const [key, testIds] of testRunsMap) {
    const [packageName, suiteName] = key.split(':');
    testRuns.push({
      packageName,
      suiteName,
      workspaceId: workspace.id,
      testIds: testIds.length > 0 ? testIds : undefined
    });
  }
  return testRuns;
}

export const handleTestRunErrorEvent = async (database: Database, testJob: TestRunJob, failedTestRun: TestRun): Promise<void> => {
  const { workspace, testIds } = testJob.params;
  const testRuns: Array<TestRun> = getWorkspaceTestRuns(workspace, testIds);

  for (const testRun of testRuns) {
    const { workspaceId, packageName, suiteName, testIds } = testRun;

    const suiteDocument: SuiteDocument | null = await database.suites.findOne({
      selector: { id: `${workspaceId}:${packageName}:${suiteName}` }
    }).exec();
    
    if (suiteDocument !== null) {
      if (testIds !== undefined) {
        const testIdQuery = testIds.map(testId => ({ id: `${workspaceId}:${packageName}:${suiteName}:${testId}` }))
        await database.tests
          .find({ selector: { $or: testIdQuery, isRunning: true } })
          .update({ $set: { status: 'invalid', isRunning: false } });
        await database.tests
          .find({ selector: { $or: testIdQuery, isWaiting: true } })
          .update({ $set: { isWaiting: false } });
      } else {
        await database.tests
          .find({ selector: { workspaceId, packageName, suiteName, isRunning: true } })
          .update({ $set: { status: 'invalid', isRunning: false } });
        await database.tests
          .find({ selector: { workspaceId, packageName, suiteName, isWaiting: true } })
          .update({ $set: { isWaiting: false } });
      }

      await suiteDocument.update({
        $set: {
          time: undefined,
          isRunning: false,
          isWaiting: false,
          status:
            suiteDocument.workspaceId === failedTestRun.workspaceId &&
            suiteDocument.packageName === failedTestRun.packageName ?
            'invalid' : suiteDocument.status
        }
      });
    }
  }
}

export const handleTestRun = async (database: Database, testIds: Array<RunnableTestId>): Promise<void> => {
  const allTestsIds: Set<string> = new Set();
  const testSuitesIds: Set<string> = new Set();
  const allSuitesIds: Set<string> = new Set();

  for (const [workspaceId, packageName, suiteName, testId] of testIds) {
    if (testId !== undefined) {
      allTestsIds.add(`${workspaceId}:${packageName}:${suiteName}:${testId}`);
    } else {
      testSuitesIds.add(`${workspaceId}:${packageName}:${suiteName}`);
    }
    allSuitesIds.add(`${workspaceId}:${packageName}:${suiteName}`);
  }

  await database.tests
    .findByIds(Array.from(allTestsIds))
    .update({ $set: { isWaiting: true } });

  await database.tests
    .find({ selector: { $or: Array.from(testSuitesIds)
      .map(id => id.split(':') as TestSuiteId)
      .map(([workspaceId, packageName, suiteName]) => ({ workspaceId, packageName, suiteName }))
    }})
    .update({ $set: { isWaiting: true } });

  await database.suites
    .findByIds(Array.from(allSuitesIds))
    .update({ $set: { isWaiting: true, time: undefined } });
}

export const getTest = async (database: Database, testId: TestId): Promise<Test> => {
  const testDocument: TestDocument | null = await database.tests.findOne({
    selector: { id: testId.join(':') }
  }).exec();

  if (testDocument === null) throw new Error(`Test not found for id: ${testId.join(':')}`);

  return {
    id: testId,
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
    percentage: testDocument.percentage,
    type: testDocument.type ? testDocument.type as TestType : undefined,
  };
}

export const onTestUpdate = (database: Database, callback: (test: Test) => void): void => {
  database.tests.update$.subscribe(changeEvent => {
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
      isWaiting: document.isWaiting,
      isRunning: document.isRunning,
      isStatic: document.isStatic,
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
      percentage: document.percentage,
      type: document.type ? document.type as TestType : undefined,
    });
  });
}
