import * as path from 'path';
import { Range, Uri } from 'vscode';

import { createRounds } from './round';
import { clearCoverageForTest, upsertCoverage } from './coverage';
import { updateTestTreeSuiteStatus } from '../../../utils/testTree';

import type { Database, PackageDocument, SuiteDocument, TestDocument } from '../collections';

// location.uri is sometimes already absolute, sometimes relative 
// resolve it against packagePath when it isn't absolute yet
// same logic as the coverage open file
const resolveTestLocation = async (
  database: Database,
  workspaceId: string,
  packageName: string,
  location: TestDocument['location'] | undefined
): Promise<Test['location']> => {
  if (!location) return undefined;

  const range = new Range(
    location.range.start.line,
    location.range.start.character,
    location.range.end.line,
    location.range.end.character
  );

  if (path.isAbsolute(location.uri)) {
    return { uri: location.uri, range };
  }

  const packageDocument: PackageDocument | null = await database.packages.findOne({
    selector: { id: [workspaceId, packageName].join(':') }
  }).exec();

  const uri = packageDocument !== null
    ? Uri.joinPath(Uri.file(packageDocument.packagePath), location.uri).fsPath
    : location.uri;

  return { uri, range };
};

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
  const [workspaceId, packageName, suiteName, testId] = event.payload.context.testId;
  if (event.payload.context.type) {
    await database.tests
      .findOne({ selector: { id: `${workspaceId}:${packageName}:${suiteName}:${testId}` } })
      .update({ $set: { type: event.payload.context.type } });
  }
  await upsertCoverage(database, [workspaceId, packageName], event.payload.coverage);
  await createRounds(database, event.payload.rounds);
}

export const handleTestRunErrorEvent = async (
  database: Database,
  event: TestRunErrorEvent,
  prefetchTree: TestTree | null
): Promise<void> => {
  const { workspaceId, packageName, suiteName, testIds } = event.payload.runParams.testRun;

  if (prefetchTree !== null) {
    updateTestTreeSuiteStatus(prefetchTree, [workspaceId, packageName, suiteName], 'invalid');
  }

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

export const handleTestRun = async (database: Database, testIds: Array<RunnableTestId>): Promise<void> => {
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

  const [workspaceId, packageName] = testId;

  return {
    id: testId,
    name: testDocument.name,
    group: testDocument.group,
    status: testDocument.status as RunStatus,
    location: await resolveTestLocation(database, workspaceId, packageName, testDocument.location),
    time: testDocument.time,
    percentage: testDocument.percentage,
    type: testDocument.type ? testDocument.type as TestType : undefined,
  };
}

export const onTestUpdate = (database: Database, callback: (test: Test) => void): void => {
  database.tests.update$.subscribe(async changeEvent => {
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
      location: await resolveTestLocation(database, document.workspaceId, document.packageName, document.location),
      time: document.time,
      percentage: document.percentage,
      type: document.type ? document.type as TestType : undefined,
    });
  });
}
