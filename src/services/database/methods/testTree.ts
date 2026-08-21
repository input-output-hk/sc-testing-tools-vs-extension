import { Range } from 'vscode';

import { createTestTree } from '../../../utils/testTree';

import type { Database, PackageDocument, SuiteDocument, TestDocument } from '../collections';

export const handleTestTree = async (database: Database, testTree: TestTree): Promise<void> => {
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
      });
    }
  }

  await database.packages.bulkUpsert(packages);
  await database.suites.bulkUpsert(suites);
}

export const buildTestTree = async (database: Database, prefetchTree: TestTree, openState: Record<string, boolean>): Promise<TestTree> => {
  const testTree: TestTree = { packages: { ...prefetchTree.packages } };
  for (const packageNode of Object.values(testTree.packages)) {
    packageNode.isOpen = openState[[packageNode.workspace.id, packageNode.name].join(':')] ?? false;
    for (const suiteNode of Object.values(packageNode.suites)) {
      suiteNode.isOpen = openState[[packageNode.workspace.id, packageNode.name, suiteNode.name].join(':')] ?? false;
    }
  }

  const packageDocuments: Array<PackageDocument> = await database.packages.find().exec();
  for (const packageDocument of packageDocuments) {
    const packageId: TestPackageId = [packageDocument.workspaceId, packageDocument.packageName];
    const packageNode: TestPackage = {
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
        name: suiteDocument.suiteName,
        status: suiteDocument.status as RunStatus,
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

      suiteNode.tests = createTestTree(suiteId, openState, tests);
    }
    
    const packageKey = packageId.join(':');
    if (!testTree.packages[packageKey]) {
      testTree.packages[packageKey] = packageNode;
    } else {
      for (const [suiteName, suiteNode] of Object.entries(packageNode.suites)) {
        if (
          !testTree.packages[packageKey].suites[suiteName] ||
          Object.keys(suiteNode.tests).length > 0
        ) {
          testTree.packages[packageKey].suites[suiteName] = suiteNode;
        }
      }
    }
  }

  return testTree;
}