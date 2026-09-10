import { Range } from 'vscode';

import { shouldUpdateSuiteTestList } from './test';
import { createTestTree } from '../../../utils/testTree';

import type { Database, PackageDocument, SuiteDocument, TestDocument } from '../collections';

export const storeStaticTestTree = async (database: Database, testTree: StaticTestTree): Promise<void> => {
  for (const testPackage of Object.values(testTree.packages)) {
    await database.packages.upsert({
      id: `${testPackage.workspace.id}:${testPackage.name}`,
      workspaceId: testPackage.workspace.id,
      workspacePath: testPackage.workspace.path,
      packageName: testPackage.name,
      packagePath: testPackage.packagePath
    });
    for (const suite of Object.values(testPackage.suites)) {
      await storeStaticTestSuite(database, suite);
    }
  }
}

export const storeStaticTestSuite = async (database: Database, testSuite: StaticTestSuite): Promise<void> => {
  const suiteDocument: SuiteDocument | null = await database.suites.findOne({
    selector: {
      id: testSuite.id.join(':')
    }
  }).exec();

  if (suiteDocument === null) {
    await database.suites.insert({
      id: testSuite.id.join(':'),
      workspaceId: testSuite.id[0],
      packageName: testSuite.id[1],
      suiteName: testSuite.name,
      status: testSuite.status,
      isWaiting: testSuite.isWaiting,
      isRunning: testSuite.isRunning,
      isStatic: testSuite.isStatic,
      time: testSuite.time,
      treeVersion: 0,
    });
  } else {
    await suiteDocument.update({
      $set: {
        status: testSuite.status,
        isWaiting: testSuite.isWaiting,
        isRunning: testSuite.isRunning,
        isStatic: testSuite.isStatic,
        time: testSuite.time,
        treeVersion: suiteDocument.treeVersion + 1,
      }
    });
  }

  await storeStaticTestList(database, testSuite.id, testSuite.tests);
}

const storeStaticTestList = async (database: Database, testSuiteId: TestSuiteId, testList: GenericMap<Test>): Promise<void> => {
  if (await shouldUpdateSuiteTestList(database, testSuiteId, testList)) {
    const [workspaceId, packageName, suiteName] = testSuiteId;
    await database.tests.find({
      selector: { workspaceId, packageName, suiteName }
    }).remove();
  }

  await database.tests.bulkUpsert(
    Object.values(testList).map(test => ({
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

export const fetchTestTree = async (database: Database, openState: Record<string, boolean>): Promise<TestTree> => {
  const testTree: TestTree = { packages: {} };

  const packageDocuments: Array<PackageDocument> = await database.packages.find().exec();
  for (const packageDocument of packageDocuments) {
    const packageId: TestPackageId = [packageDocument.workspaceId, packageDocument.packageName];
    const packageNode: TestPackage = {
      id: packageId,
      workspace: {
        id: packageDocument.workspaceId,
        path: packageDocument.workspacePath
      },
      name: packageDocument.packageName,
      packagePath: packageDocument.packagePath,
      isOpen: openState[packageId.join(':')] ?? false,
      suites: {}
    };

    const suiteDocuments: Array<SuiteDocument> = await database.suites.find({
      selector: {
        workspaceId: packageDocument.workspaceId,
        packageName: packageDocument.packageName
      }
    }).exec();

    for (const suiteDocument of suiteDocuments) {
      const suiteId: TestSuiteId = [suiteDocument.workspaceId, suiteDocument.packageName, suiteDocument.suiteName];
      const suiteNode: TestSuite = {
        id: suiteId,
        name: suiteDocument.suiteName,
        status: suiteDocument.status as RunStatus,
        isWaiting: suiteDocument.isWaiting,
        isRunning: suiteDocument.isRunning,
        isStatic: suiteDocument.isStatic,
        time: suiteDocument.time,
        isOpen: openState[suiteId.join(':')] ?? false,
        tests: {}
      };
      packageNode.suites[suiteNode.name] = suiteNode;

      const testDocuments: Array<TestDocument> = await database.tests.find({
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
        type: testDocument.type ? testDocument.type as TestType : undefined
      }));

      suiteNode.tests = createTestTree(suiteId, openState, tests);
    }
    
    testTree.packages[packageId.join(':')] = packageNode;
  }

  return testTree;
}