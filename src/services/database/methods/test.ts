import { Range } from 'vscode';

import { createRounds } from './round';
import { clearCoverageForTest, upsertCoverage } from './coverage';

import type { Database, SuiteDocument, TestDocument } from '../collections';

export const upsertTests = async (
  database: Database,
  workspaceId: string,
  packageName: string,
  suiteName: string,
  tests: Array<Test>
): Promise<void> => {
  const existingTests: Array<TestDocument> = await database.tests.find({
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

  await database.tests.bulkInsert(
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

  await database.tests.bulkRemove(removeTests);
}

export const handleTestUpdateEvent = async (database: Database, event: TestUpdateEvent): Promise<void> => {
  const { id, status, time, percentage, type } = event.payload;

  const testDocument: TestDocument | null = await database.tests.findOne({
    selector: { id: id.join(':') }
  }).exec();

  if (testDocument !== null) {
    if (status === 'running' && testDocument.status !== 'running') {
      await clearCoverageForTest(database, id);
    }

    const updateData: Partial<TestDocument> = {};
    if (status !== undefined) updateData.status = status;
    if (time !== undefined) updateData.time = time;
    if (percentage !== undefined) updateData.percentage = percentage;
    
    if (status === 'valid' || status === 'invalid') {
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
  const [workspaceId, packageName, suiteName, testId] = event.payload.id;
  if (event.payload.type) {
    await database.tests
      .findOne({ selector: { id: `${workspaceId}:${packageName}:${suiteName}:${testId}` } })
      .update({ $set: { type: event.payload.type } });
  }
  await upsertCoverage(database, [workspaceId, packageName], event.payload.coverage);
  await createRounds(database, event.payload.id, event.payload.round);
}

export const handleTestRunFailed = async (database: Database, testRun: TestRun): Promise<void> => {
  const { workspaceId, packageName, suiteName, testIds } = testRun;

  const suiteDocument: SuiteDocument | null = await database.suites.findOne({
    selector: { id: `${workspaceId}:${packageName}:${suiteName}` }
  }).exec();
  
  if (suiteDocument !== null) {
    if (testIds !== undefined) {
      const testIdQuery = testIds.map(testId => ({ id: `${workspaceId}:${packageName}:${suiteName}:${testId}` }))
      await database.tests
        .find({ selector: { $or: testIdQuery, status: 'running' } })
        .update({ $set: { status: 'invalid' } });
      await database.tests
        .find({ selector: { $or: testIdQuery, status: 'waiting' } })
        .update({ $set: { status: 'undetermined' } });
    } else {
      await database.tests
        .find({ selector: { workspaceId, packageName, suiteName, status: 'running' } })
        .update({ $set: { status: 'invalid' } });
      await database.tests
        .find({ selector: { workspaceId, packageName, suiteName, status: 'waiting' } })
        .update({ $set: { status: 'undetermined' } });
    }
    await suiteDocument.update({ $set: { status: 'invalid' } });
  }
}

export const handleRunTests = async (database: Database, testIds: Array<RunTestId>): Promise<void> => {
  const suites: Set<string> = new Set();
  for (const [workspaceId, packageName, suiteName] of testIds) {
    suites.add(`${workspaceId}:${packageName}:${suiteName}`);
  }

  await database.tests
    .findByIds(
      Array.from(testIds)
        .filter(id => id[3] !== undefined)
        .map(
          ([workspaceId, packageName, suiteName, testId]) =>
            `${workspaceId}:${packageName}:${suiteName}:${testId}`
        )
    )
    .update({ $set: { status: 'waiting' } });

  await database.tests
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

  await database.suites
    .findByIds(Array.from(suites))
    .update({ $set: { status: 'running' } });
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

export const getTestsByGroup = async (database: Database, testId: TestId, group: Array<string>): Promise<Array<Test>> => {
  const [workspaceId, packageName, suiteName] = testId;
  
  return await database.tests.find({
    selector: { workspaceId, packageName, suiteName, group }
  }).exec().then(documents => documents.map(test => ({
    id: [
      test.workspaceId,
      test.packageName,
      test.suiteName,
      test.testId
    ],
    name: test.name,
    group: test.group,
    status: test.status as RunStatus,
    location: test.location ? {
      uri: test.location.uri,
      range: new Range(
        test.location.range.start.line,
        test.location.range.start.character,
        test.location.range.end.line,
        test.location.range.end.character
      )
    } : undefined,
    time: test.time,
    percentage: test.percentage,
    type: test.type ? test.type as TestType : undefined,
  })));
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